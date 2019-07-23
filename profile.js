#!/usr/bin/env node

const color     = require('cli-color');
const program   = require('commander');
const fs        = require('fs');
const path      = require('path');
const WebSocket = require('ws');

const DEFAULTS = {
    connections_count: 3,
    request_interval : 10,
    output_path      : 'reports',
    output_file      : 'report.csv',
    ws_server        : 'red.binaryws.com',
    language         : 'EN',
    app_id           : 1,
};

program
    .version('0.0.1')
    .description('Profile WS request timing')
    .option('-c, --connections [count]', 'Number of connections to open',                           DEFAULTS.connections_count)
    .option('-d, --interval [delay]',    'Time interval (seconds) between requests per connection', DEFAULTS.request_interval)
    .option('-s, --server [ws_server]',  'WebSocket Server',                                        DEFAULTS.ws_server)
    .option('-o, --output [filename]',   'Path to the output file',                                 DEFAULTS.output_file)
    .parse(process.argv);

const ws_url      = `wss://${program.server}/websockets/v3?app_id=${DEFAULTS.app_id}&l=${DEFAULTS.language}`;
const output_path = path.join(
    DEFAULTS.output_path,
    program.output.replace(/\.csv$/, `_${Date.now()}_${program.server}_${program.connections}_connections_${program.interval}_interval.csv`),
);

const params = [
    'pid',
    'client_send',
    'ws_receive_client',
    'ws_send_rpc',
    'rpc_receive',
    'rpc_return',
    'ws_receive_rpc',
    'ws_send_client',
    'client_receive',
];

let connections = [];
let intervals   = [];
let is_started;
let file_stream;
let record_number;

const start = () => {
    is_started = true;
    record_number = 0;

    console.log(color.green('Writing to file:'), color.bold.white(output_path), '\n');

    const heading_row = `connection_number, ${params.join(', ')}`;
    console.log(color.cyan(heading_row));

    if (!fs.existsSync(DEFAULTS.output_path)){
        fs.mkdirSync(DEFAULTS.output_path);
    }
    file_stream = fs.createWriteStream(output_path, { flags: 'a' });
    file_stream.write(`${heading_row}\n`);

    for (let i = 0; i < program.connections; i++) {
        setTimeout(() => initWS(i + 1), i * 1000);
    }
};

const initWS = (conn_number) => {
    if (!is_started) {
        return;
    }

    const ws = new WebSocket(ws_url);
    connections.push(ws);

    ws.on('open', () => {
        sendRequest(ws);
        intervals.push(
            setInterval(() => { sendRequest(ws); }, program.interval * 1000)
        );
    });

    ws.on('message', (msg) => {
        const data = JSON.parse(msg);
        data.passthrough.client_receive = Date.now() / 1000;
        const values_row = generateReport(conn_number, data.passthrough);
        console.log(`(${++record_number}) ${values_row}`);
        if (file_stream) {
            file_stream.write(`${values_row}\n`);
        }
    });
};

const sendRequest = (ws) => {
    ws.send(JSON.stringify({
        landing_company: 'id',
        passthrough    : {
            profile    : 1,
            client_send: Date.now() / 1000,
        },
    }));
};

const generateReport = (connection_number, passthrough) => (
    `${connection_number}, ${params.map(param => passthrough[param]).join(', ')}`
);

const cleanup = () => {
    intervals.forEach(clearInterval);
    intervals = [];

    process.stdout.write(color.yellow(`\n\nClosing ${connections.length} connection${connections.length > 1 ? 's' : ''}... `));
    connections.forEach((ws) => { ws.close(); });
    console.log(color.green('✓ done!'));
    connections = [];

    process.stdout.write(`${color.yellow('Closing file: ')}${color.bold.white(output_path)}... `);
    file_stream.end();
    console.log(color.green('✓ done!'));
    file_stream = undefined;

    console.log(color.bold.green('\n>>'), color.bold.white(record_number), color.green('records were saved.'));
};

// initialize
process.on('SIGINT', cleanup.bind());

start();
