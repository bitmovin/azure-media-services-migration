import BitmovinApi, {StreamsVideoCreateRequest} from '@bitmovin/api-sdk';
import {
  Alert,
  Button,
  Card,
  Group,
  Stack,
  Text,
  ActionIcon,
  useMantineColorScheme,
  Loader,
  Anchor,
  Center,
} from '@mantine/core';
import {modals} from '@mantine/modals';
import {
  IconAlertCircle,
  IconMoonStars,
  IconSun,
  IconForbid,
  IconExternalLink,
  IconCircleCheck,
  IconInfoCircle,
} from '@tabler/icons-react';
import byteSize from 'byte-size';
import delay from 'delay';
import _ from 'lodash';
import {DataTable} from 'mantine-datatable';
import {useCallback, useEffect, useState} from 'react';

import jsonData from '../output.json';

enum Status {
  Loading,
  Success,
  Error,
}

const StatusToIcon = {
  [Status.Success]: <IconCircleCheck color="green" size="1.5rem" />,
  [Status.Loading]: <Loader size="1.5rem" />,
  [Status.Error]: <IconForbid color="red" size="1.5rem" />,
};

interface Asset {
  title: string;
  assetUrl: string;
  size: number;
  availability: Status;
  migration?: Status;
  streamId?: string;
}

const bitmovinClient = new BitmovinApi({apiKey: import.meta.env.VITE_BITMOVIN_API_KEY});
const PAGE_SIZES = [10, 15, 20, 25, 50, 100];
const CHUNK_SIZE = 10;
//Due to rate limits, we need to wait before executing the next creation chunk.
const CREATION_DELAY = 10_000;

export function Migration() {
  const [assets, setAssets] = useState<Asset[]>(
    (jsonData as Asset[]).map((asset) => ({...asset, availability: Status.Loading})),
  );
  const [selectedRecords, setSelectedRecords] = useState<Asset[]>([]);
  const [migratedStreams, setMigratedStreams] = useState<Asset[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [records, setRecords] = useState(assets.slice(0, pageSize));
  const {colorScheme, toggleColorScheme} = useMantineColorScheme();
  const isDarkTheme = colorScheme === 'dark';

  const processAssets = async (
    assets: Asset[],
    updateAssetAction: (asset: Asset) => Promise<Asset>,
    delayDuration?: number,
  ) => {
    const assetChunks = _.chunk(assets, CHUNK_SIZE);

    for (let chunk of assetChunks) {
      const updatedAssetsChunk = await Promise.all(chunk.map(updateAssetAction));

      if (delayDuration) {
        await delay(delayDuration);
      }

      setAssets((prevAssets) => {
        return prevAssets.map((prevAsset) => {
          const updatedAsset = updatedAssetsChunk.find((ua) => ua.assetUrl === prevAsset.assetUrl);
          return updatedAsset ?? prevAsset;
        });
      });
    }
  };

  const fetchAssetAvailability = useCallback(async () => {
    const updateWithAvailability = async (asset: Asset) => {
      try {
        const response = await fetch(asset.assetUrl, {
          method: 'HEAD',
          headers: {
            Accept: 'application/json',
          },
        });

        return {...asset, availability: response.ok ? Status.Success : Status.Error};
      } catch (error) {
        console.error(`Failed to fetch asset: ${asset.assetUrl}`, error);
        return {...asset, availability: Status.Error};
      }
    };

    await processAssets(jsonData as Asset[], updateWithAvailability);
  }, []);

  const startMigration = async () => {
    setAssets((prevAssets) => {
      return prevAssets.map((asset) => {
        if (selectedRecords.some((record) => record.assetUrl === asset.assetUrl)) {
          return {...asset, migration: Status.Loading};
        }
        return asset;
      });
    });

    const streamsCreationAction = async (asset: Asset) => {
      try {
        const streamsCreationPayload = new StreamsVideoCreateRequest({
          title: asset.title,
          assetUrl: asset.assetUrl,
        });

        const response = await bitmovinClient.streams.video.create(streamsCreationPayload);
        return {...asset, migration: Status.Success, streamId: response.id};
      } catch (error) {
        console.error(`Failed to migrate asset: ${asset.assetUrl}`, error);
        return {...asset, migration: Status.Error};
      }
    };

    await processAssets(selectedRecords, streamsCreationAction, CREATION_DELAY);
  };

  useEffect(() => {
    fetchAssetAvailability();
  }, [fetchAssetAvailability]);

  useEffect(() => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    setRecords(assets.slice(from, to));
  }, [assets, page, pageSize]);

  const handleConfirmMigration = () => {
    const migrationSize = selectedRecords.reduce((totalSize, record) => totalSize + record.size, 0);
    modals.openConfirmModal({
      title: 'Confirm Migration',
      children: (
        <Alert icon={<IconAlertCircle size="1rem" />} title="Are you sure?" color="blue" radius="lg">
          You will migrate {selectedRecords.length} assets. Totalling {`${byteSize(migrationSize)}`} to Bitmovin.
        </Alert>
      ),
      labels: {confirm: 'Confirm', cancel: 'Cancel'},
      onCancel: () => console.log('Cancel'),
      onConfirm: () => {
        startMigration();
        setSelectedRecords([]);
        setMigratedStreams([...migratedStreams, ...selectedRecords]);
      },
    });
  };

  return (
    <Stack align="center" spacing="xs" mt={50}>
      <Group>
        <Text size="xl" weight={500}>
          Bitmovin Azure Migration Tool
        </Text>
        <ActionIcon
          variant="outline"
          color={isDarkTheme ? 'yellow' : 'blue'}
          onClick={() => toggleColorScheme()}
          title="Toggle color scheme">
          {isDarkTheme ? <IconSun size="1.1rem" /> : <IconMoonStars size="1.1rem" />}
        </ActionIcon>
      </Group>
      <Alert icon={<IconInfoCircle size="1.5rem" />} color="blue">
        There may be a cost associated with migrating large amounts of content. Check out our{' '}
        <Anchor href="https://bitmovin.com/pricing/" target="_blank" rel="noreferrer">
          pricing page
        </Anchor>{' '}
        or{' '}
        <Anchor href="https://bitmovin.com/contact-bitmovin/" target="_blank" rel="noreferrer">
          contact sales
        </Anchor>{' '}
        for a custom quote and for a one-time free migration voucher.
      </Alert>
      <Card style={{width: '80%'}}>
        <DataTable
          minHeight={150}
          withBorder
          borderRadius="lg"
          shadow="md"
          highlightOnHover
          columns={[
            {
              accessor: 'availability',
              render: ({availability}) => <Center>{StatusToIcon[availability]}</Center>,
              textAlignment: 'center',
            },
            {accessor: 'title'},
            {
              accessor: 'assetUrl',
              render: ({assetUrl}) => (
                <Anchor style={{lineHeight: '1.5rem'}} href={assetUrl} target="_blank" rel="noreferrer">
                  {assetUrl}
                </Anchor>
              ),
            },
            {accessor: 'size', width: 100, render: ({size}) => `${byteSize(size)}`},
            {
              accessor: 'migration',
              render: ({migration, streamId}) => {
                switch (migration) {
                  case Status.Success:
                    return (
                      <Center>
                        <Group spacing="xs">
                          {StatusToIcon[Status.Success]}{' '}
                          <Anchor
                            style={{lineHeight: '1.5rem'}}
                            href={`https://dashboard.bitmovin.com/streams/video/${streamId}`}
                            target="_blank"
                            rel="noreferrer">
                            <Center>
                              <IconExternalLink size="1rem" />
                            </Center>
                          </Anchor>
                        </Group>
                      </Center>
                    );
                  case Status.Loading:
                  case Status.Error:
                    return <Center>{StatusToIcon[migration]}</Center>;
                  default:
                    return 'Not migrated yet';
                }
              },
            },
          ]}
          records={records}
          idAccessor="assetUrl"
          selectedRecords={selectedRecords}
          onSelectedRecordsChange={setSelectedRecords}
          isRecordSelectable={(record) =>
            !migratedStreams.some((asset) => asset.assetUrl === record.assetUrl) &&
            record.availability === Status.Success
          }
          totalRecords={assets.length}
          recordsPerPage={pageSize}
          page={page}
          onPageChange={(p) => setPage(p)}
          recordsPerPageOptions={PAGE_SIZES}
          onRecordsPerPageChange={setPageSize}
          recordsPerPageLabel="Assets per page"
        />
      </Card>
      <Button disabled={selectedRecords.length === 0} onClick={handleConfirmMigration} color="green">
        Migrate
      </Button>
    </Stack>
  );
}
