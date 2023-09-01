# Bitmovin Azure Migration Tool

A NodeJS tool easing the migration of Azure Media Service assets to Bitmovin Streams.
Download the repository and follow the steps below to run the migration tool locally.

## Prerequisites

- NodeJS v18
- Yarn, NPM or PNPM

## Setup

1. Copy the `sample.env` file and rename it to `.env`
2. Grab your Bitmovin API key from the [Bitmovin Dashboard](https://dashboard.bitmovin.com) and set it as the value for `VITE_BITMOVIN_API_KEY`
   ![Screenshot of the Bitmovin Dashboard Account Settings where the API key is located](screenshots/bitmovin_api_key.png 'Bitmovin API Key')
3. Grab the Azure environment variables:
   - Go to your Media Service account in the Azure Portal
   - Under "API access", either create a new AAD app and secret or select existing ones
   - Copy the credential values to your `.env` file
     ![Screenshot of the Azure Portal, showing where to find the credentials](screenshots/azure_credentials.png 'Azure credentials')
4. Set the "Blob service SAS URL" for your storage account as the value for `REMOTESTORAGEACCOUNTSAS`
   - You can generate one under "Shared access signature" in your Media Services' storage account
   - Following resource types and permissions are needed: `Service`, `Container`, `Object` and `Read`, `List`
     ![Screenshot of the Azure Portal, showing where to generate an SAS URL](screenshots/azure_sas_url.png 'Azure SAS url')
5. Make sure Resource sharing (CORS) is allowed for your storage account
   - Methods needed are: `GET`, `HEAD`
     ![Screenshot of the Azure Portal, showing where to find the CORS setting](screenshots/azure_cors.png 'Azure CORS setting')
6. Open up a terminal and run the following inside the project directory to install dependencies and start the migration tool:
   - Yarn: `yarn && yarn migrate`
   - NPM: `npm i && npm run migrate`
   - PNPM: `pnpm i && pnpm migrate`

## Usage

The migration tool will open to a table displaying your Media Services Assets along with their URL and size. The first column of the table will indicate if the migration tool can access the asset via the displayed asset url, if this is not the case, please check your CORS settings and your SAS URL's permissions.

Now simply select the assets you want to migrate, push the "Migrate" button and confirm the action.
![Screenshot of the Migration tool, showing the selection of assets](screenshots/migration_tool_1.png 'Migration tool - asset selection')

The migration tool will then create a Bitmovin Stream for each selected asset, indicating the progress and status in the last column and providing a direct link to each newly created Stream.

> **_NOTE:_** The migration status is not persistent and solely indicates if an asset has been migrated during the current session.

![Screenshot of the Migration tool, showing the selection of assets](screenshots/migration_tool_2.png 'Migration tool - migration success')
