"use strict";

/*
========================================================
KULIČKOVÉ TVARY PRO
========================================================

Hlavní opravy:

1. Pointer Events pro PC + Android + iPhone.
2. setPointerCapture().
3. touch-action: none.
4. Dílek se během tažení NEKONTROLUJE proti předloze.
5. Pohyb je možný po celé ploše.
6. Kontrola řešení probíhá až tlačítkem.
7. Klepnutí na buňku umí vybraný dílek umístit.
8. Šipky fungují bez limitu.
========================================================
*/


/* ======================================================
   KONFIGURACE
====================================================== */

const BOARD_WIDTH = 12;
const BOARD_HEIGHT = 10;


/* ======================================================
   BARVY DÍLKŮ
====================================================== */

const COLORS = [
    "#ff4d5a",
    "#ff8a00",
    "#ffd21f",
    "#28c7a0",
    "#00b9d8",
    "#4d7cff",
    "#7357ff",
    "#b74dff",
    "#ef4fa8",
    "#ff6a7c",
    "#80c84b",
    "#20b36b"
];


/* ======================================================
   TVARY DÍLKŮ
====================================================== */

const BASE_SHAPES = [

    [[0, 0], [1, 0], [2, 0], [3, 0]],

    [[0, 0], [0, 1], [1, 1], [2, 1]],

    [[0, 0], [1, 0], [0, 1], [1, 1]],

    [[0, 0], [1, 0], [2, 0], [1, 1]],

    [[0, 0], [0, 1], [0, 2], [1, 2]],

    [[0, 0], [1, 0], [1, 1], [2, 1]],

    [[0, 0], [1, 0], [2, 0], [2, 1]],

    [[0, 0], [1, 0], [1, 1], [2, 1], [1, 2]],

    [[0, 0], [0, 1], [1, 1], [2, 1], [2, 2]],

    [[0, 0], [1, 0], [1, 1], [1, 2], [2, 2]],

    [[0, 0], [0, 1], [1, 1], [1, 2]],

    [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]]
];


/* ======================================================
   POMOCNÉ FUNKCE
====================================================== */

function clone(value) {

    return JSON.parse(
        JSON.stringify(value)
    );
}


function normalizeShape(shape) {

    const minX = Math.min(
        ...shape.map(point => point[0])
    );

    const minY = Math.min(
        ...shape.map(point => point[1])
    );

    return shape
        .map(([x, y]) => [
            x - minX,
            y - minY
        ])
        .sort(
            (a, b) =>
                a[1] - b[1] ||
                a[0] - b[0]
        );
}


function rotateShape(shape) {

    return normalizeShape(
        shape.map(
            ([x, y]) => [-y, x]
        )
    );
}


function flipShape(shape) {

    return normalizeShape(
        shape.map(
            ([x, y]) => [-x, y]
        )
    );
}


function getDimensions(shape) {

    const width =
        Math.max(
            ...shape.map(
                point => point[0]
            )
        ) + 1;

    const height =
        Math.max(
            ...shape.map(
                point => point[1]
            )
        ) + 1;

    return {
        width,
        height
    };
}


function cellKey(x, y) {

    return `${x},${y}`;
}


/* ======================================================
   STAV HRY
====================================================== */

let pieces = [];

let selectedPieceId = null;

let moves = 0;

let seconds = 0;

let timerInterval = null;

let soundEnabled = true;

let currentMode = "game";

let currentDifficulty = "easy";

let currentChallenge = 0;


/*
    Data o právě taženém dílku.
*/

let dragging = null;


/* ======================================================
   DOM
====================================================== */

const board =
    document.getElementById("board");

const tray =
    document.getElementById("piecesTray");

const targetPreview =
    document.getElementById("targetPreview");

const message =
    document.getElementById("message");

const movesElement =
    document.getElementById("moves");

const timerElement =
    document.getElementById("timer");

const bestElement =
    document.getElementById("best");

const placedElement =
    document.getElementById("placedCount");


/* ======================================================
   VYTVOŘENÍ DÍLKŮ
====================================================== */

function createPieces() {

    pieces =
        BASE_SHAPES.map(
            (shape, index) => {

                return {

                    id: index + 1,

                    shape:
                        normalizeShape(
                            shape
                        ),

                    x: null,

                    y: null,

                    placed: false,

                    color:
                        COLORS[index]

                };

            }
        );

    selectedPieceId = null;

    moves = 0;

    seconds = 0;

    updateStats();
}


/* ======================================================
   HRACÍ PLOCHA
====================================================== */

function createBoard() {

    board.innerHTML = "";

    for (
        let y = 0;
        y < BOARD_HEIGHT;
        y++
    ) {

        for (
            let x = 0;
            x < BOARD_WIDTH;
            x++
        ) {

            const cell =
                document.createElement(
                    "div"
                );

            cell.className =
                "cell";

            cell.dataset.x = x;

            cell.dataset.y = y;


            /*
                DŮLEŽITÉ:

                Klepnutí na buňku umístí
                právě vybraný dílek.

                To je záložní způsob
                ovládání pro mobil.
            */

            cell.addEventListener(
                "click",
                () => {

                    placeSelectedAt(
                        x,
                        y
                    );

                }
            );


            board.appendChild(cell);
        }
    }
}


/* ======================================================
   VÝBĚR DÍLKU
====================================================== */

function selectPiece(id) {

    selectedPieceId = id;

    const piece =
        getPiece(id);

    if (!piece) {
        return;
    }

    setMessage(
        `Vybrán dílek ${id}. ` +
        `Přetáhni ho na plochu nebo klepni na cílové místo.`
    );

    render();
}


/* ======================================================
   NAJÍT DÍLEK
====================================================== */

function getPiece(id) {

    return pieces.find(
        piece =>
            piece.id === id
    );
}


/* ======================================================
   OBSAZENÉ BUŇKY
====================================================== */

function getOccupiedCells(
    excludeId = null
) {

    const occupied =
        new Set();

    pieces
        .filter(
            piece =>
                piece.placed &&
                piece.id !== excludeId
        )
        .forEach(
            piece => {

                piece.shape.forEach(
                    ([dx, dy]) => {

                        occupied.add(
                            cellKey(
                                piece.x + dx,
                                piece.y + dy
                            )
                        );

                    }
                );

            }
        );

    return occupied;
}


/* ======================================================
   LZE DÍLEK UMÍSTIT?
====================================================== */

function canPlacePiece(
    piece,
    x,
    y
) {

    const {
        width,
        height
    } = getDimensions(
        piece.shape
    );


    /*
        Kontrola hranic.
    */

    if (
        x < 0 ||
        y < 0 ||
        x + width > BOARD_WIDTH ||
        y + height > BOARD_HEIGHT
    ) {

        return false;
    }


    /*
        Kontrola kolize.
    */

    const occupied =
        getOccupiedCells(
            piece.id
        );


    return piece.shape.every(
        ([dx, dy]) => {

            return !occupied.has(
                cellKey(
                    x + dx,
                    y + dy
                )
            );

        }
    );
}


/* ======================================================
   UMÍSTĚNÍ VYBRANÉHO DÍLKU
====================================================== */

function placeSelectedAt(
    x,
    y
) {

    if (
        !selectedPieceId
    ) {

        return;
    }

    const piece =
        getPiece(
            selectedPieceId
        );

    if (!piece) {
        return;
    }


    const {
        width,
        height
    } = getDimensions(
        piece.shape
    );


    /*
        Zarovnáme střed dílku
        na klepnutou buňku.
    */

    let newX =
        x -
        Math.floor(
            width / 2
        );

    let newY =
        y -
        Math.floor(
            height / 2
        );


    /*
        Omezíme pouze hranicemi
        hrací plochy.

        NE předlohou.
    */

    newX =
        Math.max(
            0,
            Math.min(
                BOARD_WIDTH -
                    width,
                newX
            )
        );

    newY =
        Math.max(
            0,
            Math.min(
                BOARD_HEIGHT -
                    height,
                newY
            )
        );


    if (
        canPlacePiece(
            piece,
            newX,
            newY
        )
    ) {

        piece.x = newX;

        piece.y = newY;

        piece.placed = true;

        moves++;

        playClick();

        render();

        setMessage(
            `Dílek ${piece.id} umístěn.`
        );

    } else {

        setMessage(
            "Na tomto místě je jiný dílek.",
            "bad"
        );
    }
}


/* ======================================================
   PŘEVOD POZICE PRSTU / MYŠI NA BUŇKU
====================================================== */

function pointerToBoardCell(
    event
) {

    const rect =
        board.getBoundingClientRect();


    /*
        Používáme skutečnou velikost
        hrací plochy.

        Díky tomu funguje i na mobilu.
    */

    const relativeX =
        event.clientX -
        rect.left;

    const relativeY =
        event.clientY -
        rect.top;


    const x =
        Math.floor(
            relativeX /
            rect.width *
            BOARD_WIDTH
        );

    const y =
        Math.floor(
            relativeY /
            rect.height *
            BOARD_HEIGHT
        );


    return {
        x,
        y
    };
}


/* ======================================================
   ZAČÁTEK TAŽENÍ
====================================================== */

function startDragging(
    event,
    piece
) {

    event.preventDefault();

    event.stopPropagation();


    selectPiece(
        piece.id
    );


    /*
        Klíčová oprava pro mobil:

        Pointer Capture zajistí,
        že pohyb zůstane připojen
        k právě taženému prvku,
        i když prst opustí jeho hranice.
    */

    try {

        event.currentTarget.setPointerCapture(
            event.pointerId
        );

    } catch (error) {

        console.warn(
            "Pointer capture není dostupný.",
            error
        );

    }


    dragging = {

        pieceId:
            piece.id,

        pointerId:
            event.pointerId

    };


    document.addEventListener(
        "pointermove",
        handleDragMove,
        {
            passive: false
        }
    );


    document.addEventListener(
        "pointerup",
        finishDragging,
        {
            once: true
        }
    );


    document.addEventListener(
        "pointercancel",
        finishDragging,
        {
            once: true
        }
    );


    setMessage(
        `Přesouváš dílek ${piece.id}…`
    );
}


/* ======================================================
   POHYB PŘI TAŽENÍ
====================================================== */

function handleDragMove(
    event
) {

    if (!dragging) {
        return;
    }


    event.preventDefault();


    const piece =
        getPiece(
            dragging.pieceId
        );


    if (!piece) {
        return;
    }


    const {
        x,
        y
    } =
        pointerToBoardCell(
            event
        );


    const {
        width,
        height
    } =
        getDimensions(
            piece.shape
        );


    /*
        Střed dílku držíme pod prstem.
    */

    let newX =
        x -
        Math.floor(
            width / 2
        );

    let newY =
        y -
        Math.floor(
            height / 2
        );


    /*
        POZOR:

        Dříve zde byla chyba.

        Dílky byly během pohybu
        kontrolovány proti předloze.

        To je špatně.

        Nyní kontrolujeme pouze
        hranice hrací plochy.
    */

    newX =
        Math.max(
            0,
            Math.min(
                BOARD_WIDTH -
                    width,
                newX
            )
        );

    newY =
        Math.max(
            0,
            Math.min(
                BOARD_HEIGHT -
                    height,
                newY
            )
        );


    /*
        Pokud místo není obsazené,
        dílek se přesune.

        Předloha se zde vůbec
        nekontroluje.
    */

    if (
        canPlacePiece(
            piece,
            newX,
            newY
        )
    ) {

        piece.x = newX;

        piece.y = newY;

        piece.placed = true;

        render();
    }
}


/* ======================================================
   KONEC TAŽENÍ
====================================================== */

function finishDragging() {

    document.removeEventListener(
        "pointermove",
        handleDragMove
    );


    dragging = null;


    if (selectedPieceId) {

        setMessage(
            `Vybrán dílek ${selectedPieceId}.`
        );
    }
}


/* ======================================================
   VYKRESLENÍ ZÁSOBNÍKU
====================================================== */

function renderTray() {

    tray.innerHTML = "";


    pieces.forEach(
        piece => {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "piece-card";


            if (
                piece.id ===
                selectedPieceId
            ) {

                card.classList.add(
                    "selected"
                );
            }


            if (
                piece.placed
            ) {

                card.classList.add(
                    "placed"
                );
            }


            card.dataset.id =
                piece.id;


            const shape =
                document.createElement(
                    "div"
                );

            shape.className =
                "mini-shape";


            const {
                width,
                height
            } =
                getDimensions(
                    piece.shape
                );


            shape.style.width =
                `${width * 21}px`;

            shape.style.height =
                `${height * 21}px`;


            piece.shape.forEach(
                ([x, y]) => {

                    const bead =
                        document.createElement(
                            "span"
                        );

                    bead.className =
                        "mini-bead";


                    bead.style.width =
                        "21px";

                    bead.style.height =
                        "21px";


                    bead.style.left =
                        `${x * 21}px`;

                    bead.style.top =
                        `${y * 21}px`;


                    bead.style.background =
                        piece.color;


                    shape.appendChild(
                        bead
                    );

                }
            );


            card.appendChild(
                shape
            );


            const number =
                document.createElement(
                    "span"
                );

            number.className =
                "piece-number";

            number.textContent =
                piece.id;


            card.appendChild(
                number
            );


            /*
                PointerDown místo
                pouze MouseDown.

                Funguje PC + Android + iPhone.
            */

            card.addEventListener(
                "pointerdown",
                event => {

                    startDragging(
                        event,
                        piece
                    );

                }
            );


            card.addEventListener(
                "click",
                () => {

                    selectPiece(
                        piece.id
                    );

                }
            );


            tray.appendChild(
                card
            );

        }
    );
}


/* ======================================================
   VYKRESLENÍ DÍLKŮ NA PLOŠE
====================================================== */

function renderBoardPieces() {

    board
        .querySelectorAll(
            ".board-piece"
        )
        .forEach(
            element =>
                element.remove()
        );


    pieces
        .filter(
            piece =>
                piece.placed
        )
        .forEach(
            piece => {

                const {
                    width,
                    height
                } =
                    getDimensions(
                        piece.shape
                    );


                const element =
                    document.createElement(
                        "div"
                    );


                element.className =
                    "board-piece";


                if (
                    piece.id ===
                    selectedPieceId
                ) {

                    element.classList.add(
                        "selected"
                    );
                }


                element.style.gridColumn =
                    `${piece.x + 1} / span ${width}`;


                element.style.gridRow =
                    `${piece.y + 1} / span ${height}`;


                piece.shape.forEach(
                    ([x, y]) => {

                        const bead =
                            document.createElement(
                                "span"
                            );


                        bead.className =
                            "bead";


                        bead.style.setProperty(
                            "--piece",
                            piece.color
                        );


                        bead.style.left =
                            `${x / width * 100}%`;


                        bead.style.top =
                            `${y / height * 100}%`;


                        bead.style.width =
                            `${100 / width}%`;


                        bead.style.height =
                            `${100 / height}%`;


                        element.appendChild(
                            bead
                        );

                    }
                );


                /*
                    I již položený dílek
                    lze znovu uchopit.
                */

                element.addEventListener(
                    "pointerdown",
                    event => {

                        startDragging(
                            event,
                            piece
                        );

                    }
                );


                element.addEventListener(
                    "click",
                    () => {

                        selectPiece(
                            piece.id
                        );

                    }
                );


                board.appendChild(
                    element
                );

            }
        );


    placedElement.textContent =
        `${pieces.filter(
            piece => piece.placed
        ).length} / 12 dílků`;
}


/* ======================================================
   CELKOVÝ RENDER
====================================================== */

function render() {

    renderTray();

    renderBoardPieces();

    updateStats();

}


/* ======================================================
   OTÁČENÍ
====================================================== */

function transformSelected(
    operation
) {

    const piece =
        getPiece(
            selectedPieceId
        );


    if (!piece) {
        return;
    }


    const oldShape =
        clone(
            piece.shape
        );


    if (
        operation ===
        "right"
    ) {

        piece.shape =
            rotateShape(
                piece.shape
            );

    }


    if (
        operation ===
        "left"
    ) {

        piece.shape =
            rotateShape(
                rotateShape(
                    rotateShape(
                        piece.shape
                    )
                )
            );

    }


    if (
        operation ===
        "flip"
    ) {

        piece.shape =
            flipShape(
                piece.shape
            );

    }


    /*
        Pokud změna tvaru způsobí,
        že se nevejde na plochu,
        vrátíme starý tvar.
    */

    if (
        piece.placed &&
        !canPlacePiece(
            piece,
            piece.x,
            piece.y
        )
    ) {

        piece.shape =
            oldShape;

        setMessage(
            "Tento tvar se na aktuální místo nevejde.",
            "bad"
        );

        return;
    }


    moves++;

    playClick();

    render();
}


/* ======================================================
   POSUN KLÁVESNICÍ
====================================================== */

function moveSelected(
    dx,
    dy
) {

    const piece =
        getPiece(
            selectedPieceId
        );


    if (
        !piece ||
        !piece.placed
    ) {

        return;
    }


    const newX =
        piece.x + dx;

    const newY =
        piece.y + dy;


    /*
        Nyní není žádný limit
        typu "maximálně 2×".

        Pohyb funguje po celé ploše.
    */

    if (
        canPlacePiece(
            piece,
            newX,
            newY
        )
    ) {

        piece.x =
            newX;

        piece.y =
            newY;

        moves++;

        render();
    }
}


/* ======================================================
   VRÁCENÍ DÍLKU
====================================================== */

function removeSelectedPiece() {

    const piece =
        getPiece(
            selectedPieceId
        );


    if (!piece) {
        return;
    }


    piece.placed =
        false;

    piece.x =
        null;

    piece.y =
        null;


    moves++;


    render();


    setMessage(
        `Dílek ${piece.id} byl vrácen.`
    );
}


/* ======================================================
   STATISTIKY
====================================================== */

function updateStats() {

    movesElement.textContent =
        moves;


    const minutes =
        String(
            Math.floor(
                seconds / 60
            )
        ).padStart(
            2,
            "0"
        );


    const secs =
        String(
            seconds % 60
        ).padStart(
            2,
            "0"
        );


    timerElement.textContent =
        `${minutes}:${secs}`;
}


/* ======================================================
   ČASOMÍRA
====================================================== */

function startTimer() {

    stopTimer();


    timerInterval =
        setInterval(
            () => {

                seconds++;

                updateStats();

            },
            1000
        );
}


function stopTimer() {

    if (
        timerInterval
    ) {

        clearInterval(
            timerInterval
        );

        timerInterval =
            null;
    }
}


/* ======================================================
   ZPRÁVA
====================================================== */

function setMessage(
    text,
    type = ""
) {

    message.textContent =
        text;


    message.className =
        "message";


    if (type) {

        message.classList.add(
            type
        );

    }
}


/* ======================================================
   ZVUK
====================================================== */

function playClick() {

    if (!soundEnabled) {
        return;
    }


    try {

        const audioContext =
            new (
                window.AudioContext ||
                window.webkitAudioContext
            )();


        const oscillator =
            audioContext.createOscillator();


        const gain =
            audioContext.createGain();


        oscillator.frequency.value =
            600;


        oscillator.type =
            "sine";


        gain.gain.value =
            0.03;


        oscillator.connect(
            gain
        );

        gain.connect(
            audioContext.destination
        );


        oscillator.start();

        oscillator.stop(
            audioContext.currentTime +
            0.08
        );

    } catch (error) {

        console.warn(
            "Zvuk není dostupný.",
            error
        );

    }
}


/* ======================================================
   NOVÁ HRA
====================================================== */

function newGame() {

    stopTimer();

    createPieces();

    createBoard();

    render();

    setMessage(
        "Nová hra. Vyber dílek a začni skládat."
    );

    startTimer();
}


/* ======================================================
   VYČISTIT PLOCHU
====================================================== */

function clearBoard() {

    pieces.forEach(
        piece => {

            piece.placed =
                false;

            piece.x =
                null;

            piece.y =
                null;

        }
    );


    moves++;


    render();


    setMessage(
        "Hrací plocha byla vyčištěna."
    );
}


/* ======================================================
   KLÁVESNICE
====================================================== */

document.addEventListener(
    "keydown",
    event => {

        /*
            Pokud píšeme do inputu,
            klávesy hry se nemají spouštět.
        */

        const tag =
            document.activeElement?.tagName;


        if (
            tag === "INPUT" ||
            tag === "SELECT" ||
            tag === "TEXTAREA"
        ) {

            return;
        }


        if (
            event.key.toLowerCase() === "r"
        ) {

            event.preventDefault();

            transformSelected(
                "right"
            );

        }


        if (
            event.key.toLowerCase() === "e"
        ) {

            event.preventDefault();

            transformSelected(
                "left"
            );

        }


        if (
            event.key.toLowerCase() === "f"
        ) {

            event.preventDefault();

            transformSelected(
                "flip"
            );

        }


        if (
            event.key === "ArrowLeft"
        ) {

            event.preventDefault();

            moveSelected(
                -1,
                0
            );

        }


        if (
            event.key === "ArrowRight"
        ) {

            event.preventDefault();

            moveSelected(
                1,
                0
            );

        }


        if (
            event.key === "ArrowUp"
        ) {

            event.preventDefault();

            moveSelected(
                0,
                -1
            );

        }


        if (
            event.key === "ArrowDown"
        ) {

            event.preventDefault();

            moveSelected(
                0,
                1
            );

        }


        if (
            event.key === "Delete" ||
            event.key === "Backspace"
        ) {

            event.preventDefault();

            removeSelectedPiece();

        }

    }
);


/* ======================================================
   TLAČÍTKA
====================================================== */

document
    .getElementById(
        "rotateLeft"
    )
    .addEventListener(
        "click",
        () =>
            transformSelected(
                "left"
            )
    );


document
    .getElementById(
        "rotateRight"
    )
    .addEventListener(
        "click",
        () =>
            transformSelected(
                "right"
            )
    );


document
    .getElementById(
        "flipPiece"
    )
    .addEventListener(
        "click",
        () =>
            transformSelected(
                "flip"
            )
    );


document
    .getElementById(
        "removePiece"
    )
    .addEventListener(
        "click",
        removeSelectedPiece
    );


document
    .getElementById(
        "clearBoard"
    )
    .addEventListener(
        "click",
        clearBoard
    );


document
    .getElementById(
        "newGame"
    )
    .addEventListener(
        "click",
        newGame
    );


document
    .getElementById(
        "soundButton"
    )
    .addEventListener(
        "click",
        event => {

            soundEnabled =
                !soundEnabled;


            event.currentTarget.textContent =
                soundEnabled
                    ? "🔊 Zvuk"
                    : "🔇 Zvuk";

        }
    );


/* ======================================================
   BARVY
====================================================== */

document
    .getElementById(
        "shuffleColors"
    )
    .addEventListener(
        "click",
        () => {

            COLORS.sort(
                () =>
                    Math.random() -
                    0.5
            );


            pieces.forEach(
                (piece, index) => {

                    piece.color =
                        COLORS[index];

                }
            );


            render();

        }
    );


/* ======================================================
   START
====================================================== */

createPieces();

createBoard();

render();

startTimer();
