import * as fs from 'fs';
import * as process from 'process';

import {AzureMediaServices} from '@azure/arm-mediaservices';
import {DefaultAzureCredential} from '@azure/identity';
import {BlobServiceClient} from '@azure/storage-blob';
import * as dotenv from 'dotenv';

dotenv.config();

let mediaServicesClient: AzureMediaServices;
let client: BlobServiceClient;

// Copy the samples.env file and rename it to .env first, then populate it's values with the values obtained
// from your Media Services account's API Access page in the Azure portal.
const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
const resourceGroup = process.env.AZURE_RESOURCE_GROUP;
const accountName = process.env.AZURE_MEDIA_SERVICES_ACCOUNT_NAME;
const credential = new DefaultAzureCredential();

// A SAS URL to a remote blob storage account that you want to read files from
// Generate a Read/List SAS token URL in the portal under the storage accounts "shared access signature" menu
// Grant the allowed resource types : Service, Container, and Object
// Grant the allowed permissions: Read, List
const remoteSasUrl = process.env.REMOTESTORAGEACCOUNTSAS;

interface Asset {
  title: string;
  assetUrl: string;
  size: number;
}

function createBlobServiceClient(sasUrl: string): BlobServiceClient {
  client = new BlobServiceClient(sasUrl);
  return client;
}

async function getAssetBlobs(blobServiceClient: BlobServiceClient, containerName: string): Promise<Array<Asset>> {
  const blobArray: Array<Asset> = [];
  const containerClient = blobServiceClient.getContainerClient(containerName);

  for await (const blob of containerClient.listBlobsFlat()) {
    if (blob.properties?.contentType && /video/.test(blob.properties.contentType)) {
      blobArray.push({
        title: blob.name,
        assetUrl: containerClient.getBlockBlobClient(blob.name).url,
        size: blob.properties.contentLength,
      });
    }
  }

  return blobArray;
}

function getLargestBlob(assetBlobs: Array<Asset>): Asset {
  const maxBlobSize = Math.max.apply(
    Math,
    assetBlobs.map((x) => x.size),
  );
  return assetBlobs.find((i) => i.size === maxBlobSize);
}

function writeToJsonFile(data, path = './output.json') {
  fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
}

export async function main() {
  mediaServicesClient = new AzureMediaServices(credential, subscriptionId);

  const blobServiceClient = createBlobServiceClient(remoteSasUrl);
  const assets: Array<Asset> = [];

  for await (const asset of mediaServicesClient.assets.list(resourceGroup, accountName)) {
    console.log('Getting containers for: ', asset.name);
    if (asset.container) {
      const assetBlobs = await getAssetBlobs(blobServiceClient, asset.container);

      if (assetBlobs.length > 0) {
        const maxBlob = getLargestBlob(assetBlobs);
        console.log(maxBlob);
        assets.push(maxBlob);
      }
    }
  }
  writeToJsonFile(assets);
}

main().catch((err) => {
  console.error('Error running sample:', err.message);
  console.error(`Error code: ${err.code}`);
  console.error('Error request:\n\n', err);

  if (err.name === 'RestError') {
    if (err.code === 'AuthenticationFailed') {
      console.error(
        'Check the SAS URL you provided or re-create a new one that has the right permission grants and expiration dates',
      );
      console.error(
        '\tGenerate a Read/List SAS token URL in the portal under the storage accounts shared access signature menu',
      );
      console.error('\tGrant the allowed resource types : Service, Container, and Object');
      console.error('\tGrant the allowed permissions: Read, List');
    } else {
      // General REST API Error message
      console.error('Error request:\n\n', err.request);
    }
  }
  process.exit(1);
});
