"use strict";

/*
========================================================
KULIČKOVÉ TVARY PRO
SYSTÉM NÁHODNĚ PŘEDLOŽENÝCH DÍLKŮ
========================================================

PRINCIP:

1. Vygenerujeme kompletní řešení.
2. Z kompletního řešení vybereme několik dílků.
3. Ty automaticky položíme na hrací plochu.
4. Ostatní dílky zůstanou hráči k dispozici.
5. Hráč postupně doplňuje zbývající dílky.
6. Počet předem vložených dílků určuje obtížnost.

========================================================
*/


/* ======================================================
   NASTAVENÍ
====================================================== */

const BOARD_WIDTH = 12;
const BOARD_HEIGHT = 10;


/*
    Kolik dílků se předem umístí
    podle obtížnosti.
*/

const DIFFICULTY_RULES = {

    veryEasy: {
        min: 8,
        max: 9,
        name: "VELMI LEHKÁ",
        color: "green"
    },

    easy: {
        min: 6,
        max: 7,
        name: "LEHKÁ",
        color: "green"
    },

    medium: {
        min: 4,
        max: 5,
        name: "STŘEDNÍ",
        color: "yellow"
    },

    hard: {
        min: 2,
        max: 3,
        name: "TĚŽKÁ",
        color: "red"
    },

    expert: {
        min: 1,
        max: 1,
        name: "EXPERT",
        color: "red"
    }

};


/* ======================================================
   BARVY
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
   ZÁKLADNÍ TVARY
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
   STAV
====================================================== */

let pieces = [];

let selectedPieceId = null;

let solution = [];

let targetCells = new Set();

let preplacedCount = 0;

let currentDifficulty = "medium";

let moves = 0;

let seconds = 0;

let timerInterval = null;

let dragging = null;

let soundEnabled = true;


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

const placedElement =
    document.getElementById("placedCount");

const bestElement =
    document.getElementById("best");

const difficultyBadge =
    document.getElementById("difficultyBadge");

const challengeName =
    document.getElementById("challengeName");


/* ======================================================
   POMOCNÉ FUNKCE
====================================================== */

function clone(value) {

    return JSON.parse(
        JSON.stringify(value)
    );

}


function randomInt(min, max) {

    return Math.floor(
        Math.random() *
        (max - min + 1)
    ) + min;

}


function shuffle(array) {

    const result =
        [...array];

    for (
        let i = result.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() *
                (i + 1)
            );

        [
            result[i],
            result[j]
        ] =
        [
            result[j],
            result[i]
        ];

    }

    return result;

}


function cellKey(x, y) {

    return `${x},${y}`;

}


/* ======================================================
   TVARY
====================================================== */

function normalizeShape(shape) {

    const minX =
        Math.min(
            ...shape.map(
                p => p[0]
            )
        );

    const minY =
        Math.min(
            ...shape.map(
                p => p[1]
            )
        );


    return shape

        .map(
            ([x, y]) => [
                x - minX,
                y - minY
            ]
        )

        .sort(
            (a, b) =>
                a[1] - b[1] ||
                a[0] - b[0]
        );

}


function rotateShape(shape) {

    return normalizeShape(

        shape.map(
            ([x, y]) => [
                -y,
                x
            ]
        )

    );

}


function flipShape(shape) {

    return normalizeShape(

        shape.map(
            ([x, y]) => [
                -x,
                y
            ]
        )

    );

}


function getDimensions(shape) {

    return {

        width:
            Math.max(
                ...shape.map(
                    p => p[0]
                )
            ) + 1,

        height:
            Math.max(
                ...shape.map(
                    p => p[1]
                )
            ) + 1

    };

}


/* ======================================================
   VARIANTY TVARŮ
====================================================== */

function getShapeVariants(shape) {

    const variants = [];

    let current =
        normalizeShape(
            shape
        );


    for (
        let flip = 0;
        flip < 2;
        flip++
    ) {

        let working =
            flip === 0
                ? current
                : flipShape(current);


        for (
            let rotation = 0;
            rotation < 4;
            rotation++
        ) {

            const key =
                JSON.stringify(
                    working
                );


            if (
                !variants.some(
                    v =>
                        JSON.stringify(v) ===
                        key
                )
            ) {

                variants.push(
                    clone(
                        working
                    )
                );

            }


            working =
                rotateShape(
                    working
                );

        }

    }


    return variants;

}


/* ======================================================
   VYTVOŘENÍ DÍLKŮ
====================================================== */

function createPieces() {

    pieces =
        BASE_SHAPES.map(
            (shape, index) => {

                return {

                    id:
                        index + 1,

                    shape:
                        normalizeShape(
                            shape
                        ),

                    x:
                        null,

                    y:
                        null,

                    placed:
                        false,

                    fixed:
                        false,

                    color:
                        COLORS[index]

                };

            }
        );


    selectedPieceId =
        null;

}


/* ======================================================
   GENEROVÁNÍ KOMPLETNÍHO ŘEŠENÍ
======================================================

    Náhodně položíme všech 12 dílků
    tak, aby se nepřekrývaly.

====================================================== */

function generateSolution() {

    const placements = [];

    const occupied =
        new Set();


    /*
        Největší dílky nejdříve.
    */

    const order =
        [...pieces]
            .sort(
                (a, b) =>
                    b.shape.length -
                    a.shape.length
            );


    for (
        const piece of order
    ) {

        const variants =
            shuffle(
                getShapeVariants(
                    piece.shape
                )
            );


        let placed =
            false;


        for (
            const shape
            of variants
        ) {

            if (placed) {
                break;
            }


            const {
                width,
                height
            } =
                getDimensions(
                    shape
                );


            const positions = [];


            for (
                let y = 0;
                y <=
                BOARD_HEIGHT -
                height;
                y++
            ) {

                for (
                    let x = 0;
                    x <=
                    BOARD_WIDTH -
                    width;
                    x++
                ) {

                    positions.push({
                        x,
                        y
                    });

                }

            }


            /*
                Náhodné pořadí pozic.
            */

            const shuffledPositions =
                shuffle(
                    positions
                );


            for (
                const position
                of shuffledPositions
            ) {

                const valid =
                    shape.every(
                        ([dx, dy]) =>
                            !occupied.has(
                                cellKey(
                                    position.x + dx,
                                    position.y + dy
                                )
                            )
                    );


                if (!valid) {
                    continue;
                }


                /*
                    Položení dílku.
                */

                const placement = {

                    id:
                        piece.id,

                    shape:
                        clone(shape),

                    x:
                        position.x,

                    y:
                        position.y

                };


                placements.push(
                    placement
                );


                shape.forEach(
                    ([dx, dy]) => {

                        occupied.add(
                            cellKey(
                                position.x + dx,
                                position.y + dy
                            )
                        );

                    }
                );


                placed = true;

                break;

            }

        }


        /*
            Pokud se náhodné řešení
            nepodařilo vytvořit,
            generování začneme znovu.
        */

        if (!placed) {

            return generateSolution();

        }

    }


    return placements;

}


/* ======================================================
   VÝBĚR OBTÍŽNOSTI
====================================================== */

function chooseDifficulty() {

    const levels =
        Object.keys(
            DIFFICULTY_RULES
        );


    /*
        Náhodné rozložení obtížností.

        Nejčastěji střední.
    */

    const random =
        Math.random();


    if (
        random < 0.10
    ) {

        return "veryEasy";

    }


    if (
        random < 0.35
    ) {

        return "easy";

    }


    if (
        random < 0.70
    ) {

        return "medium";

    }


    if (
        random < 0.93
    ) {

        return "hard";

    }


    return "expert";

}


/* ======================================================
   PŘEDVYPLNĚNÍ DÍLKŮ
====================================================== */

function preplacePieces() {

    const rule =
        DIFFICULTY_RULES[
            currentDifficulty
        ];


    preplacedCount =
        randomInt(
            rule.min,
            rule.max
        );


    /*
        Vybereme náhodné dílky.
    */

    const ids =
        shuffle(
            pieces.map(
                p => p.id
            )
        );


    const selectedIds =
        ids.slice(
            0,
            preplacedCount
        );


    pieces.forEach(
        piece => {

            const placement =
                solution.find(
                    item =>
                        item.id ===
                        piece.id
                );


            if (!placement) {
                return;
            }


            /*
                Všimneme si,
                zda má být dílek
                předem vložen.
            */

            if (
                selectedIds.includes(
                    piece.id
                )
            ) {

                piece.shape =
                    clone(
                        placement.shape
                    );

                piece.x =
                    placement.x;

                piece.y =
                    placement.y;

                piece.placed =
                    true;

                piece.fixed =
                    true;

            }

        }
    );

}


/* ======================================================
   VYTVOŘENÍ CÍLOVÉHO TVARU
====================================================== */

function createTarget() {

    targetCells.clear();


    solution.forEach(
        placement => {

            placement.shape.forEach(
                ([dx, dy]) => {

                    targetCells.add(
                        cellKey(
                            placement.x + dx,
                            placement.y + dy
                        )
                    );

                }
            );

        }
    );

}


/* ======================================================
   ZOBRAZENÍ PŘEDLOHY
====================================================== */

function renderTargetPreview() {

    targetPreview.innerHTML =
        "";


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
                "target-cell";


            if (
                targetCells.has(
                    cellKey(x, y)
                )
            ) {

                cell.classList.add(
                    "target"
                );

            }


            targetPreview.appendChild(
                cell
            );

        }

    }

}


/* ======================================================
   VYTVOŘENÍ HRACÍ PLOCHY
====================================================== */

function createBoard() {

    board.innerHTML =
        "";


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


            cell.dataset.x =
                x;

            cell.dataset.y =
                y;


            cell.addEventListener(
                "click",
                () => {

                    placeSelectedAt(
                        x,
                        y
                    );

                }
            );


            board.appendChild(
                cell
            );

        }

    }

}


/* ======================================================
   VYBRAT DÍLEK
====================================================== */

function selectPiece(id) {

    const piece =
        pieces.find(
            p =>
                p.id === id
        );


    if (!piece) {
        return;
    }


    /*
        Předem umístěné dílky
        nelze přesouvat.

        Jsou součástí zadání.
    */

    if (piece.fixed) {

        setMessage(
            `Dílek ${id} je součástí zadání a nelze ho přesouvat.`
        );

        return;

    }


    selectedPieceId =
        id;


    setMessage(
        `Vybrán dílek ${id}. Přesuň ho na plochu.`
    );


    render();

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
   KONTROLA UMÍSTĚNÍ
====================================================== */

function canPlacePiece(
    piece,
    x,
    y
) {

    const {
        width,
        height
    } =
        getDimensions(
            piece.shape
        );


    if (
        x < 0 ||
        y < 0 ||
        x + width >
            BOARD_WIDTH ||
        y + height >
            BOARD_HEIGHT
    ) {

        return false;

    }


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
   POZICE PRSTU
====================================================== */

function pointerToCell(
    event
) {

    const rect =
        board.getBoundingClientRect();


    const x =
        Math.floor(
            (
                event.clientX -
                rect.left
            ) /
            rect.width *
            BOARD_WIDTH
        );


    const y =
        Math.floor(
            (
                event.clientY -
                rect.top
            ) /
            rect.height *
            BOARD_HEIGHT
        );


    return {
        x,
        y
    };

}


/* ======================================================
   UMÍSTĚNÍ KLEPNUTÍM
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
        pieces.find(
            p =>
                p.id ===
                selectedPieceId
        );


    if (
        !piece ||
        piece.fixed
    ) {

        return;

    }


    const {
        width,
        height
    } =
        getDimensions(
            piece.shape
        );


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

        piece.x =
            newX;

        piece.y =
            newY;

        piece.placed =
            true;

        moves++;

        render();

        setMessage(
            `Dílek ${piece.id} umístěn.`
        );

    } else {

        setMessage(
            "Na tomto místě už je jiný dílek.",
            "bad"
        );

    }

}


/* ======================================================
   TAŽENÍ DÍLKU
====================================================== */

function startDragging(
    event,
    piece
) {

    if (
        piece.fixed
    ) {

        setMessage(
            `Dílek ${piece.id} je předem vložený.`
        );

        return;

    }


    event.preventDefault();

    event.stopPropagation();


    selectPiece(
        piece.id
    );


    try {

        event.currentTarget.setPointerCapture(
            event.pointerId
        );

    } catch (error) {
        console.warn(error);
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

}


/* ======================================================
   POHYB DÍLKU
====================================================== */

function handleDragMove(
    event
) {

    if (!dragging) {
        return;
    }


    event.preventDefault();


    const piece =
        pieces.find(
            p =>
                p.id ===
                dragging.pieceId
        );


    if (!piece) {
        return;
    }


    const {
        x,
        y
    } =
        pointerToCell(
            event
        );


    const {
        width,
        height
    } =
        getDimensions(
            piece.shape
        );


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
        Plynulý pohyb po CELÉ ploše.
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
        Kontrolujeme pouze kolizi.
        Ne kontrolu správnosti.
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

        piece.placed =
            true;

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


    dragging =
        null;

}


/* ======================================================
   VYKRESLENÍ DÍLKŮ
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


                if (
                    piece.fixed
                ) {

                    element.classList.add(
                        "fixed-piece"
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


                if (
                    !piece.fixed
                ) {

                    element.addEventListener(
                        "pointerdown",
                        event => {

                            startDragging(
                                event,
                                piece
                            );

                        }
                    );

                }


                element.addEventListener(
                    "click",
                    () => {

                        if (
                            !piece.fixed
                        ) {

                            selectPiece(
                                piece.id
                            );

                        }

                    }
                );


                board.appendChild(
                    element
                );

            }
        );


    placedElement.textContent =
        `${pieces.filter(
            p => p.placed
        ).length} / 12 dílků`;

}


/* ======================================================
   ZÁSOBNÍK
====================================================== */

function renderTray() {

    tray.innerHTML =
        "";


    pieces.forEach(
        piece => {

            /*
                Předem položené dílky
                v zásobníku nebudeme
                zobrazovat jako dostupné.
            */

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
                piece.fixed
            ) {

                card.classList.add(
                    "placed"
                );

            }


            const miniShape =
                document.createElement(
                    "div"
                );


            miniShape.className =
                "mini-shape";


            const {
                width,
                height
            } =
                getDimensions(
                    piece.shape
                );


            miniShape.style.width =
                `${width * 21}px`;


            miniShape.style.height =
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


                    miniShape.appendChild(
                        bead
                    );

                }
            );


            card.appendChild(
                miniShape
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


            if (
                !piece.fixed
            ) {

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

            }


            tray.appendChild(
                card
            );

        }
    );

}


/* ======================================================
   CELKOVÉ VYKRESLENÍ
====================================================== */

function render() {

    renderBoardPieces();

    renderTray();

    updateStats();

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
   NASTAVENÍ OBTÍŽNOSTI
====================================================== */

function updateDifficultyDisplay() {

    const rule =
        DIFFICULTY_RULES[
            currentDifficulty
        ];


    difficultyBadge.textContent =
        rule.name;


    challengeName.textContent =
        `Předem vloženo ${preplacedCount} z 12 dílků`;

}


/* ======================================================
   NOVÁ HRA
====================================================== */

function startNewPuzzle() {

    stopTimer();


    createPieces();


    /*
        Vygenerujeme kompletní řešení.
    */

    solution =
        generateSolution();


    /*
        Z řešení vytvoříme cílový tvar.
    */

    createTarget();


    /*
        Náhodně zvolíme obtížnost.
    */

    currentDifficulty =
        chooseDifficulty();


    /*
        Náhodně předvyplníme dílky.
    */

    preplacePieces();


    updateDifficultyDisplay();


    renderTargetPreview();


    createBoard();


    render();


    moves = 0;

    seconds = 0;


    updateStats();


    setMessage(

        `Úkol je připraven. ` +
        `Na ploše je již ${preplacedCount} dílků. ` +
        `Doplň zbývající dílky.`

    );


    startTimer();

}


/* ======================================================
   KONTROLA ŘEŠENÍ
====================================================== */

function checkSolution() {

    /*
        Všechny dílky musí být položeny.
    */

    const allPlaced =
        pieces.every(
            piece =>
                piece.placed
        );


    if (!allPlaced) {

        const remaining =
            pieces.filter(
                piece =>
                    !piece.placed
            ).length;


        setMessage(

            `Ještě chybí ${remaining} ` +
            `dílk${remaining === 1 ? "a" : "y"}.`,

            "bad"

        );


        return;
    }


    /*
        Vytvoříme skutečně obsazené buňky.
    */

    const occupied =
        getOccupiedCells();


    /*
        Počet musí odpovídat
        cílovému tvaru.
    */

    if (
        occupied.size !==
        targetCells.size
    ) {

        setMessage(
            "Počet obsazených polí nesouhlasí s předlohou.",
            "bad"
        );

        return;
    }


    /*
        Kontrola každého pole.
    */

    const correct =
        [...targetCells].every(
            cell =>
                occupied.has(
                    cell
                )
        );


    if (!correct) {

        setMessage(
            "Některé dílky nejsou na správném místě.",
            "bad"
        );

        return;
    }


    /*
        ÚSPĚCH
    */

    stopTimer();


    setMessage(
        "Výborně! Předloha je správně složená.",
        "good"
    );


    saveBestResult();


    showSuccess();

}


/* ======================================================
   REKORD
====================================================== */

function saveBestResult() {

    const key =
        `kt-${currentDifficulty}`;


    let records = {};


    try {

        records =
            JSON.parse(
                localStorage.getItem(
                    "ktpro-records"
                ) || "{}"
            );

    } catch (error) {

        records = {};

    }


    const previous =
        records[key];


    if (
        !previous ||
        seconds <
            previous.seconds
    ) {

        records[key] = {

            seconds,

            moves,

            preplaced:
                preplacedCount,

            date:
                new Date()
                    .toLocaleDateString(
                        "cs-CZ"
                    )

        };


        localStorage.setItem(
            "ktpro-records",
            JSON.stringify(
                records
            )
        );

    }

}


/* ======================================================
   ÚSPĚCH
====================================================== */

function showSuccess() {

    const modal =
        document.getElementById(
            "successModal"
        );


    const text =
        document.getElementById(
            "successText"
        );


    if (text) {

        text.textContent =
            `Hotovo za ${formatTime(seconds)} ` +
            `a ${moves} tahů.`;

    }


    if (modal) {

        modal.classList.remove(
            "hidden"
        );

    }


    playSuccessSound();

}


/* ======================================================
   FORMÁT ČASU
====================================================== */

function formatTime(secondsValue) {

    const minutes =
        String(
            Math.floor(
                secondsValue / 60
            )
        ).padStart(
            2,
            "0"
        );


    const secondsPart =
        String(
            secondsValue % 60
        ).padStart(
            2,
            "0"
        );


    return `${minutes}:${secondsPart}`;

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
   ZVUK
====================================================== */

function playSuccessSound() {

    if (!soundEnabled) {
        return;
    }


    try {

        const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;


        if (!AudioContext) {
            return;
        }


        const audio =
            new AudioContext();


        const oscillator =
            audio.createOscillator();


        const gain =
            audio.createGain();


        oscillator.type =
            "sine";


        oscillator.frequency.value =
            880;


        gain.gain.value =
            0.04;


        oscillator.connect(
            gain
        );


        gain.connect(
            audio.destination
        );


        oscillator.start();


        oscillator.stop(
            audio.currentTime +
            0.25
        );

    } catch (error) {

        console.warn(
            "Zvuk není dostupný."
        );

    }

}


/* ======================================================
   TLAČÍTKA
====================================================== */

document
    .getElementById(
        "newGame"
    )
    .addEventListener(
        "click",
        startNewPuzzle
    );


document
    .getElementById(
        "checkButton"
    )
    .addEventListener(
        "click",
        checkSolution
    );


document
    .getElementById(
        "clearBoard"
    )
    .addEventListener(
        "click",
        () => {

            pieces.forEach(
                piece => {

                    if (
                        piece.fixed
                    ) {
                        return;
                    }


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
                "Pohyblivé dílky byly vráceny."
            );

        }
    );


document
    .getElementById(
        "resetButton"
    )
    .addEventListener(
        "click",
        startNewPuzzle
    );


/* ======================================================
   OTÁČENÍ
====================================================== */

document
    .getElementById(
        "rotateRight"
    )
    .addEventListener(
        "click",
        () => {

            const piece =
                pieces.find(
                    p =>
                        p.id ===
                        selectedPieceId
                );


            if (
                !piece ||
                piece.fixed
            ) {
                return;
            }


            piece.shape =
                rotateShape(
                    piece.shape
                );


            moves++;

            render();

        }
    );


document
    .getElementById(
        "rotateLeft"
    )
    .addEventListener(
        "click",
        () => {

            const piece =
                pieces.find(
                    p =>
                        p.id ===
                        selectedPieceId
                );


            if (
                !piece ||
                piece.fixed
            ) {
                return;
            }


            piece.shape =
                rotateShape(
                    rotateShape(
                        rotateShape(
                            piece.shape
                        )
                    )
                );


            moves++;

            render();

        }
    );


document
    .getElementById(
        "flipPiece"
    )
    .addEventListener(
        "click",
        () => {

            const piece =
                pieces.find(
                    p =>
                        p.id ===
                        selectedPieceId
                );


            if (
                !piece ||
                piece.fixed
            ) {
                return;
            }


            piece.shape =
                flipShape(
                    piece.shape
                );


            moves++;

            render();

        }
    );


/* ======================================================
   VRÁCENÍ DÍLKU
====================================================== */

document
    .getElementById(
        "removePiece"
    )
    .addEventListener(
        "click",
        () => {

            const piece =
                pieces.find(
                    p =>
                        p.id ===
                        selectedPieceId
                );


            if (
                !piece ||
                piece.fixed
            ) {
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
    );


/* ======================================================
   ZVUK
====================================================== */

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
   KLÁVESNICE
====================================================== */

document.addEventListener(
    "keydown",
    event => {

        const tag =
            document.activeElement
                ?.tagName;


        if (
            tag === "INPUT" ||
            tag === "SELECT" ||
            tag === "TEXTAREA"
        ) {

            return;

        }


        const piece =
            pieces.find(
                p =>
                    p.id ===
                    selectedPieceId
            );


        if (
            !piece ||
            piece.fixed
        ) {
            return;
        }


        if (
            event.key ===
            "ArrowLeft"
        ) {

            event.preventDefault();

            moveSelected(
                -1,
                0
            );

        }


        if (
            event.key ===
            "ArrowRight"
        ) {

            event.preventDefault();

            moveSelected(
                1,
                0
            );

        }


        if (
            event.key ===
            "ArrowUp"
        ) {

            event.preventDefault();

            moveSelected(
                0,
                -1
            );

        }


        if (
            event.key ===
            "ArrowDown"
        ) {

            event.preventDefault();

            moveSelected(
                0,
                1
            );

        }

    }
);


/* ======================================================
   POHYB KLÁVESNICÍ
====================================================== */

function moveSelected(
    dx,
    dy
) {

    const piece =
        pieces.find(
            p =>
                p.id ===
                selectedPieceId
        );


    if (
        !piece ||
        piece.fixed ||
        !piece.placed
    ) {

        return;

    }


    const newX =
        piece.x + dx;


    const newY =
        piece.y + dy;


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
   START
====================================================== */

createPieces();

createBoard();

startNewPuzzle();
