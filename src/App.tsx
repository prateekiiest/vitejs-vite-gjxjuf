import { CopyIcon, CheckCircleIcon, WarningIcon } from '@chakra-ui/icons';
import { Frame, Line } from 'scintilla';
import {
  Button,
  Code,
  Input,
  InputGroup,
  Box,
  Table,
  TableCaption,
  Tag,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Text,
  Stack,
  useClipboard,
  Flex,
} from '@chakra-ui/react';
import ReactJson from 'react-json-view';
import React, { useState, useEffect, Fragment } from 'react';
import {
  getChannels,
  getHoprAddress,
  getHoprBalance,
  getInfo,
  getNativeAddress,
  getNativeBalance,
  getTickets,
  getVersion,
  getUptime,
} from './api';

const truncate = (str: string, chars = 10) =>
  str.substr(0, chars) + '...' + str.substr(str.length - chars, chars);

const parseEther = (value: string) =>
  Number((BigInt(value) / 10n ** 14n).toString()) / 10000;

type Host = {
  url: URL;
  domain: string;
  token: string;
};

type Balance = {
  native: string;
  hopr: string;
};

type Address = Balance;

type Node = {
  index: number;
  httpEndpoint: string;
  wsEndpoint: string;
  address: Address;
  balance: Balance;
  version: string;
  uptimer: () => Promise<number>;
  info?: any;
  channels?: any;
  tickets?: any;
};

type Nodes = { [key: string]: Node[] };

type ResponseAddress = {
  nativeAddress: string;
  hoprAddress: string;
};

const EndpointButton = ({
  endpoint,
  variant = 'solid',
  label,
}: {
  endpoint: string;
  variant?: string;
  label: string;
}) => {
  const { hasCopied, onCopy } = useClipboard(endpoint);
  return (
    <Button
      onClick={onCopy}
      leftIcon={<CopyIcon />}
      colorScheme="teal"
      variant={variant}
    >
      {hasCopied ? `Copied ${label}` : label}
    </Button>
  );
};

const RedLine = ({
  uptimer,
}: {
  uptimer?: () => Promise<number> | undefined;
}) => {
  const [demoUptime, setDemoUptime] = useState<number[]>([0]);
  useEffect(() => {
    const timeout = setTimeout(async () => {
      const uptime = uptimer ? await uptimer() : Math.random() * 10;
      setDemoUptime((prevUptime) => {
        const limitedArray =
          prevUptime.length > 10 ? prevUptime.slice(1) : prevUptime;
        return [...limitedArray, uptime];
      });
    }, 1000);
    return () => {
      clearTimeout(timeout);
    };
  }, [demoUptime]);
  return (
    <div style={{ width: '200px' }}>
      <Frame>
        <Line
          data={demoUptime}
          stroke={{
            color: { solid: [255, 0, 0, 1] },
            width: 2,
            style: 'solid',
          }}
        />
      </Frame>
    </div>
  );
};

const Hosts = ({
  host,
  nodes,
  domain,
}: {
  host: string;
  nodes: Nodes;
  domain: string;
}) => (
  <Table key={host} size="sm">
    <Thead>
      <Tr>
        <Th colSpan={5}>{host}</Th>
      </Tr>
    </Thead>
    <Tbody>
      {nodes[host] &&
        nodes[host].map((node) => (
          <Fragment key={node.address.hopr}>
            <Tr>
              <Td>
                <Flex alignItems="center">
                  {node.address ? <CheckCircleIcon /> : <WarningIcon />}{' '}
                  <Text mx="2">Host</Text>
                  {node.index + 1}
                  <Tag mx="2" colorScheme="yellow">
                    {domain}
                  </Tag>
                </Flex>
              </Td>
              <Td>
                <Stack direction="row" spacing={4}>
                  <EndpointButton endpoint={node.wsEndpoint} label="WS" />
                  <EndpointButton
                    endpoint={node.httpEndpoint}
                    label="HTTP"
                    variant="outline"
                  />
                </Stack>
              </Td>
              <Td>
                <Code>
                  {node.address
                    ? truncate(node.address.hopr)
                    : 'No HOPR address'}
                </Code>
              </Td>
              <Td>
                <Code>
                  {node.address
                    ? truncate(node.address.native)
                    : 'No ETH address'}
                </Code>
              </Td>
              <Td>
                <RedLine uptimer={node.uptimer} />
              </Td>
            </Tr>
            <Tr>
              <Th colSpan={2}>General</Th>
              <Th>Info</Th>
              <Th>Channels</Th>
              <Th>Tickets</Th>
            </Tr>
            <Tr>
              <Td colSpan={2}>
                <Code>Balance</Code>:{parseEther(node.balance.hopr)} HOPR,{' '}
                {parseEther(node.balance.native)} ETH
                <br />
                <Code>Version</Code>:{node.version}
              </Td>
              <Td>
                <ReactJson src={node.info} collapsed />
              </Td>
              <Td>
                <ReactJson src={node.channels} collapsed />
              </Td>
              <Td>
                <ReactJson src={node.tickets} collapsed />
              </Td>
            </Tr>
          </Fragment>
        ))}
    </Tbody>
  </Table>
);

function App() {
  const [host, setHost] = useState('');
  const [hosts, setHosts] = useState<{ [key: string]: Host }>({});
  const [nodes, setNodes] = useState<Nodes>({});
  const [customToken, setCustomToken] = useState<string>('');

  const getHeaders = (securityToken: string, isPost = false) => {
    const headers = new Headers();
    if (isPost) {
      headers.set('Content-Type', 'application/json');
      headers.set('Accept-Content', 'application/json');
    }
    headers.set('Authorization', 'Basic ' + btoa(securityToken));
    return headers;
  };

  const loadHosts = async (
    NODES: number,
    DEFAULT_SECURITY_TOKEN: string,
    BASE_HTTP: (index: number) => string,
    BASE_WS: (index: number) => string,
    BASE_HC: (index: number) => string
  ) => {
    return await Promise.all(
      [...Array(NODES)].map(async (_, index) => {
        const headers = getHeaders(DEFAULT_SECURITY_TOKEN);
        const hoprAddress = await getHoprAddress(BASE_HTTP(index + 1), headers);
        const nativeAddress = await getNativeAddress(
          BASE_HTTP(index + 1),
          headers
        );
        const hoprBalance = await getHoprBalance(BASE_HTTP(index + 1), headers);
        const nativeBalance = await getNativeBalance(
          BASE_HTTP(index + 1),
          headers
        );
        const version = await getVersion(BASE_HTTP(index + 1), headers);
        const uptimer = () => getUptime(BASE_HC(index + 1));
        const info = await getInfo(BASE_HTTP(index + 1), headers);
        const channels = await getChannels(BASE_HTTP(index + 1), headers);
        const tickets = await getTickets(BASE_HTTP(index + 1), headers);
        return {
          index,
          address: { hopr: hoprAddress, native: nativeAddress },
          version,
          uptimer: uptimer,
          info,
          channels,
          tickets,
          balance: { hopr: hoprBalance, native: nativeBalance },
          httpEndpoint: BASE_HTTP(index + 1),
          wsEndpoint: BASE_WS(index + 1),
        };
      })
    );
  };

  const loadGitpodHosts = async (url: URL) => {
    const NODES = 5;
    const DEFAULT_SECURITY_TOKEN = '^^LOCAL-testing-123^^';
    const BASE_HTTP = (index: number) => `https://1330${index}-${url.hostname}`;
    const BASE_WS = (index: number) => `wss://1950${index}-${url.hostname}`;
    const BASE_HC = (index: number) => `https://1808${index}-${url.hostname}`;

    return loadHosts(
      NODES,
      DEFAULT_SECURITY_TOKEN,
      BASE_HTTP,
      BASE_WS,
      BASE_HC
    );
  };

  const loadCustomHosts = async (url: URL, customToken: string) => {
    const NODES = 1;
    const DEFAULT_SECURITY_TOKEN = customToken;
    const BASE_HTTP = (index: number) => `http://${url.hostname}:3001`;
    const BASE_WS = (index: number) => `ws://${url.hostname}:3000`;
    const BASE_HC = (index: number) => `http://${url.hostname}:8080`;

    return loadHosts(
      NODES,
      DEFAULT_SECURITY_TOKEN,
      BASE_HTTP,
      BASE_WS,
      BASE_HC
    );
  };

  useEffect(() => {
    const loadNodesFromHosts = async () => {
      Object.keys(hosts).map(async (host) => {
        switch (hosts[host].domain) {
          case 'gitpod.io':
            const gitpodNodes = await loadGitpodHosts(hosts[host].url);
            setNodes((prevNodes) => ({ [host]: gitpodNodes, ...prevNodes }));
            break;
          default:
            const nodes = await loadCustomHosts(hosts[host].url, customToken);
            setNodes((prevNodes) => ({ [host]: nodes, ...prevNodes }));
            break;
        }
      });
    };
    loadNodesFromHosts();
  }, [hosts]);

  const enterNode = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      try {
        const url = new URL(host);
        const domain = url.hostname.split('.').slice(-2).join('.');
        setHosts((prevHosts) => ({
          [host]: { url, domain, token: customToken },
          ...prevHosts,
        }));
      } catch (err) {}
    }
  };

  const exampleTable = (
    <Hosts
      host={'localhost'}
      nodes={{
        localhost: [
          {
            index: 0,
            balance: {
              hopr: '1234000000000000000',
              native: '2345000000000000000',
            },
            channels: {
              incoming: [
                {
                  type: 'incoming',
                  channelId:
                    '0x04e50b7ddce9770f58cebe51f33b472c92d1c40384759f5a0b1025220bf15ec5',
                  peerId:
                    '16Uiu2HAmVfV4GKQhdECMqYmUMGLy84RjTJQxTWDcmUX5847roBar',
                  status: 'Open',
                  balance: '10000000000000000000',
                },
              ],
              outgoing: [
                {
                  type: 'incoming',
                  channelId:
                    '0x04e50b7ddce9770f58cebe51f33b472c92d1c40384759f5a0b1025220bf15ec5',
                  peerId:
                    '16Uiu2HAmVfV4GKQhdECMqYmUMGLy84RjTJQxTWDcmUX5847roBar',
                  status: 'Open',
                  balance: '10000000000000000000',
                },
              ],
            },
            info: {
              environment: 'hardhat-localhost',
              announcedAddress: [
                '/ip4/128.0.215.32/tcp/9080/p2p/16Uiu2HAm91QFjPepnwjuZWzK5pb5ZS8z8qxQRfKZJNXjkgGNUAit',
                '/p2p/16Uiu2HAmLpqczAGfgmJchVgVk233rmB2T3DSn2gPG6JMa5brEHZ1/p2p-circuit/p2p/16Uiu2HAm91QFjPepnwjuZWzK5pb5ZS8z8qxQRfKZJNXjkgGNUAit',
                '/ip4/127.0.0.1/tcp/9080/p2p/16Uiu2HAm91QFjPepnwjuZWzK5pb5ZS8z8qxQRfKZJNXjkgGNUAit',
                '/ip4/192.168.178.56/tcp/9080/p2p/16Uiu2HAm91QFjPepnwjuZWzK5pb5ZS8z8qxQRfKZJNXjkgGNUAit',
              ],
              listeningAddress: [
                '/ip4/0.0.0.0/tcp/9080/p2p/16Uiu2HAm91QFjPepnwjuZWzK5pb5ZS8z8qxQRfKZJNXjkgGNUAit',
              ],
              network: 'hardhat',
              hoprToken: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
              hoprChannels: '0x2a54194c8fe0e3CdeAa39c49B95495aA3b44Db63',
              channelClosurePeriod: 1,
            },
            tickets: {
              pending: 0,
              unredeemed: 0,
              unredeemedValue: 'string',
              redeemed: 0,
              redeemedValue: 'string',
              losingTickets: 0,
              winProportion: 0,
              neglected: 0,
              rejected: 0,
              rejectedValue: 'string',
            },
            version: '1.87.x',
            httpEndpoint: 'http://localhost:3001',
            wsEndpoint: 'ws//localhost:3000',
            address: {
              hopr: '16Uiu2HAmE9b3TSHeF25uJS1Ecf2Js3TutnaSnipdV9otEpxbRN8Q',
              native: '0xEA9eDAE5CfC794B75C45c8fa89b605508A03742a',
            },
          },
        ],
      }}
      domain={'localhost'}
    />
  );

  return (
    <>
      <Table variant="simple">
        <TableCaption>
          list of available hopr nodes{' '}
          <Button size="sm" onClick={() => setHosts({})}>
            clear
          </Button>
        </TableCaption>
        <Tbody>
          <Tr>
            <Td>{exampleTable}</Td>
          </Tr>
          <Tr>
            <Td>
              {Object.keys(hosts).map((host) => (
                <Hosts
                  key={host}
                  host={host}
                  nodes={nodes}
                  domain={hosts[host].domain}
                />
              ))}
            </Td>
          </Tr>
        </Tbody>
      </Table>
      <Box>
        <InputGroup>
          <Input
            placeholder="node host e.g. https://hoprnet-hoprnet-j4zbg3yajqp.ws-eu31.gitpod.io/ or localhost"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            onKeyPress={enterNode}
          />
          <Input
            placeholder="^^LOCAL-testing-123^^"
            value={customToken}
            onChange={(e) => setCustomToken(e.target.value)}
          />
        </InputGroup>
      </Box>
    </>
  );
}

export default App;
