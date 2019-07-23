const WS_URL = 'wss://www.binaryqa34.com/websockets/v3?app_id=1&l=EN';
const DEFAULT_CONNECTIONS = 3;
const DEFAULT_INTERVAL    = 10; // seconds

let connections = [];
let intervals = [];
let is_started;

let el_btn_start;
let el_btn_stop;
let el_result_container;

const init = () => {
    el_result_container = document.getElementById('result_container');

    el_btn_start = document.getElementById('btn_start');
    el_btn_start.addEventListener('click', start);

    el_btn_stop = document.getElementById('btn_stop');
    el_btn_stop.addEventListener('click', stop);
}

const start = () => {
    if (is_started) {
        console.warn('Already started!');
        return;
    }

    setStatus(true);

    el_result_container.innerHTML = '';

    const conn_count = document.getElementById('txt_connection_count').value || DEFAULT_CONNECTIONS;

    for (let i = 0; i < conn_count; i++) {
        setTimeout(() => initWS(i + 1), i * 1000);
    }
};

const stop = () => {
    setStatus(false);

    intervals.forEach(clearInterval);
    intervals = [];

    console.log(`closing ${connections.length} connection(s)...`);
    connections.forEach((ws) => { ws.close(); });
    console.log('done!');
    connections = [];
};

const setStatus = (is_start) => {
    is_started = is_start;
    console.log(is_started ? 'started' : 'stopped!');
    if (is_started) {
        el_btn_start.setAttribute('disabled', true);
        el_btn_stop.removeAttribute('disabled');
    } else {
        el_btn_start.removeAttribute('disabled');
        el_btn_stop.setAttribute('disabled', true);
    }
};

const initWS = (number) => {
    if (!is_started) {
        return;
    }

    console.log(number);
    const ws = new WebSocket(WS_URL);
    connections.push(ws);

    const el_title = document.createElement('h5');
    el_title.textContent = `Connection #${number}`;
    el_result_container.appendChild(el_title);

    const el_result = document.createElement('div');
    el_result.id = `result_${number}`;
    el_result.classList.add('result');
    el_result_container.appendChild(el_result);

    const interval = document.getElementById('txt_interval').value || DEFAULT_INTERVAL;
    ws.onopen = () => {
        sendRequest(ws);
        intervals.push(
            setInterval(() => { sendRequest(ws); }, interval * 1000)
        );
    };

    ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        data.passthrough.client_receive = Date.now();
        console.log('Response: %o', data);
        el_result.innerHTML += `${reportValues(data.passthrough)}<br>${'-'.repeat(40)}<br>`;
    };
};

const sendRequest = (ws) => {
    ws.send(JSON.stringify({
        landing_company: 'id',
        passthrough    : { client_send: Date.now() }
    }));
};

const reportValues = (data) => Object.keys(data).reduce((acc, key) => `${acc ? acc + '<br>' : '' }${key.padStart(20, ' ')}: ${data[key]}`, '');


// initialise
addEventListener('DOMContentLoaded', init);
