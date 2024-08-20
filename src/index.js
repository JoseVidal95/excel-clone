const $ = el => document.querySelector(el);
const $$ = el => document.querySelectorAll(el);

const ROWS = 10;
const COLUMNS = 5;

const $table = $('table');
const $head = $('thead');
const $body = $('tbody');

const range = length => Array.from({ length }, (_, i) => i);

const FIRST_CHAR_CODE = 65; // A
const getColumnName =
    idx => String.fromCharCode(FIRST_CHAR_CODE + idx);

let STATE = range(COLUMNS).map(() => range(ROWS).map(j => ({
    computedValue: '',
    value: ''
})));

const getState = (column, row) => STATE[column][row];

let selectedColumn = null;

const renderSpreadSheet = () => {
    const headerHTML = `<tr>
                    <th></th>
                    ${range(COLUMNS).map(i => `<th>${getColumnName(i)}</th>`).join('')}
                </tr>`;
    $head.innerHTML = headerHTML;
    const bodyHTML = range(ROWS).map(row => `<tr>
                    <td>${row + 1}</td>
                    ${range(COLUMNS).map(columm => `
                        <td data-x="${columm}" data-y="${row}">
                            <span>${getState(columm, row).computedValue}</span>
                            <input type="text" value="${getState(columm, row).value}" />
                        </td>
                    `).join('')}
                </tr>`).join('');
    $body.innerHTML = bodyHTML;
};

const generateCellsConstants = cells =>
    cells.map((rows, x) => rows.map((cell, y) => {
        const letter = getColumnName(x);
        const cellId = `${letter}${y + 1}`;

        return `const ${cellId} = ${cell.computedValue || 0};`;
    }).join('\n')).join('\n');

const computeValue = (value, constants) => {
    if (!value.startsWith('=')) return value;

    const expression = value.substring(1);

    let computedValue;
    try {
        computedValue = eval(`(()=>{
                    ${constants}
                    return ${expression}
                })()`);
    } catch (error) {
        computedValue = `!Error: ${error.message}`;
    }

    return computedValue;
};

const computeAllCells = (cells, constants) => {
    cells.forEach((rows, x) => rows.forEach((cell, y) => {
        const computedValue = computeValue(cell.value, constants);
        cell.computedValue = computedValue;
    }));
};

const updateCell = ({ x, y, value }) => {
    const newState = structuredClone(STATE);
    const constants = generateCellsConstants(newState);
    const cell = getState(x, y);

    const computedValue = computeValue(value, constants);
    cell.computedValue = computedValue; // span
    cell.value = value; // input

    newState[x][y] = cell;

    computeAllCells(newState, generateCellsConstants(newState));

    STATE = newState;

    renderSpreadSheet();
};

$body.addEventListener('click', event => {
    const td = event.target.closest('td');

    if (!td) return;

    const { x, y } = td.dataset;
    const input = td.querySelector('input');
    const span = td.querySelector('span');

    const end = input.value.length;
    input.setSelectionRange(end, end);
    input.focus();

    input.addEventListener('keydown', event => {
        if (event.key === 'Enter') input.blur();
    });

    input.addEventListener('blur', event => {
        const value = event.target.value;
        const state = getState(x, y);

        if (state.value === value) return;

        updateCell({ x, y, value });
    }, { once: true });
});

$head.addEventListener('click', event => {
    const th = event.target.closest('th');

    if (!th) return;

    const x = [...th.parentNode.children].indexOf(th);

    if (x < 0) return;

    $$('.selected').forEach(el => el.classList.remove('selected'));

    selectedColumn = x - 1;

    th.classList.add('selected');
    $$(`tr td:nth-child(${x + 1})`).forEach(el => {
        el.classList.add('selected');
    });
});

document.addEventListener('keydown', event => {
    if (event.key === 'Backspace' && selectedColumn !== null) {
        range(ROWS).forEach(row => {
            updateCell({ x: selectedColumn, y: row, value: '' });
        });

        selectedColumn = null;

        renderSpreadSheet();
    }
});

document.addEventListener('copy', event => {
    event.preventDefault();

    if (selectedColumn !== null) {
        const values = range(ROWS).map(
            row => getState(selectedColumn, row).computedValue
        );

        event.clipboardData.setData('text/plain', values.join('\n'));
    }
});

document.addEventListener('click', event => {
    const { target } = event;

    const isThClicked = target.closest('th');

    if (!isThClicked) {
        $$('.selected').forEach(el => el.classList.remove('selected'));
        selectedColumn = null;
    }
});

renderSpreadSheet();
