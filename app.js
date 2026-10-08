/* =========================================================
   KULIČKOVÉ TVARY PRO
   KOMPLETNÍ APP.JS
   VERZE 3.0

   PC + TABLET + MOBIL

   OPRAVY:
   - volný pohyb dílků
   - dotykové ovládání
   - obtížnosti
   - velikosti 12x10 / 8x10 / 8x8
   - přepínání režimů
   - předem vložené dílky
   - kontrola řešení
========================================================= */

"use strict";


/* =========================================================
   ZÁKLADNÍ NASTAVENÍ
========================================================= */

let W = 12;
let H = 10;


/* =========================================================
   BARVY DÍLKŮ
========================================================= */

const COLORS = [

    "#ff4054",
    "#ff8a00",
    "#ffd21f",
    "#22c99a",
    "#00b9dc",
    "#4d7cff",
    "#7655ff",
    "#b84dff",
    "#ee4fa7",
    "#ff6979",
    "#80c94a",
    "#20b56b"

];


/* =========================================================
   ZÁKLADNÍ TVARY
========================================================= */

const BASE_SHAPES = [

    [
        [0,0],
        [1,0],
        [2,0],
        [3,0]
    ],

    [
        [0,0],
        [0,1],
        [1,1],
        [2,1]
    ],

    [
        [0,0],
        [1,0],
        [0,1],
        [1,1]
    ],

    [
        [0,0],
        [1,0],
        [2,0],
        [1,1]
    ],

    [
        [0,0],
        [0,1],
        [0,2],
        [1,2]
    ],

    [
        [0,0],
        [1,0],
        [1,1],
        [2,1]
    ],

    [
        [0,0],
        [1,0],
        [2,0],
        [2,1]
    ],

    [
        [0,0],
        [1,0],
        [1,1],
        [2,1],
        [1,2]
    ],

    [
        [0,0],
        [0,1],
        [1,1],
        [2,1],
        [2,2]
    ],

    [
        [0,0],
        [1,0],
        [1,1],
        [1,2],
        [2,2]
    ],

    [
        [0,0],
        [0,1],
        [1,1],
        [1,2]
    ],

    [
        [0,0],
        [1,0],
        [2,0],
        [1,1],
        [1,2]
    ]

];


/* =========================================================
   OBTÍŽNOST
========================================================= */

const DIFFICULTY = {

    veryEasy: {

        label:
            "VELMI LEHKÁ",

        min:
            8,

        max:
            9,

        width:
            12,

        height:
            10

    },


    easy: {

        label:
            "LEHKÁ",

        min:
            6,

        max:
            7,

        width:
            12,

        height:
            10

    },


    medium: {

        label:
            "STŘEDNÍ",

        min:
            4,

        max:
            5,

        width:
            8,

        height:
            10

    },


    hard: {

        label:
            "TĚŽKÁ",

        min:
            2,

        max:
            3,

        width:
            8,

        height:
            8

    },


    expert: {

        label:
            "EXPERT",

        min:
            1,

        max:
            1,

        width:
            8,

        height:
            8

    }

};


/* =========================================================
   STAV APLIKACE
========================================================= */

let pieces = [];

let solution = [];

let target = new Set();

let selectedId = null;

let difficulty = "medium";

let preplaced = 0;

let moves = 0;

let seconds = 0;

let timer = null;

let soundEnabled = true;

let currentView = "game";


/*
   Informace o právě taženém dílku.
*/

let dragState = null;


/* =========================================================
   DOM
========================================================= */

const $ = id =>
    document.getElementById(id);


const board =
    $("board");

const tray =
    $("piecesTray");

const preview =
    $("targetPreview");

const message =
    $("message");

const movesEl =
    $("moves");

const timerEl =
    $("timer");

const placedEl =
    $("placedCount");

const badge =
    $("difficultyBadge");

const challengeName =
    $("challengeName");


/* =========================================================
   POMOCNÉ FUNKCE
========================================================= */

function clone(value) {

    return JSON.parse(
        JSON.stringify(value)
    );

}


function key(x, y) {

    return `${x},${y}`;

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


function normalize(shape) {

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
            ([x,y]) => [
                x - minX,
                y - minY
            ]
        )

        .sort(
            (a,b) =>
                a[1] - b[1] ||
                a[0] - b[0]
        );

}


function rotate(shape) {

    return normalize(

        shape.map(
            ([x,y]) => [
                -y,
                x
            ]
        )

    );

}


function flip(shape) {

    return normalize(

        shape.map(
            ([x,y]) => [
                -x,
                y
            ]
        )

    );

}


function dimensions(shape) {

    return {

        w:
            Math.max(
                ...shape.map(
                    p => p[0]
                )
            ) + 1,

        h:
            Math.max(
                ...shape.map(
                    p => p[1]
                )
            ) + 1

    };

}


function formatTime(value) {

    return (

        String(
            Math.floor(
                value / 60
            )
        )
        .padStart(
            2,
            "0"
        )

        +

        ":" +

        String(
            value % 60
        )
        .padStart(
            2,
            "0"
        )

    );

}


function setMessage(
    text,
    type = ""
) {

    if (!message) {
        return;
    }


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


/* =========================================================
   VARIANTY TVARŮ
========================================================= */

function getVariants(shape) {

    const result = [];

    let current =
        normalize(
            shape
        );


    for (
        let f = 0;
        f < 2;
        f++
    ) {

        let working =
            f === 0
                ? current
                : flip(current);


        for (
            let r = 0;
            r < 4;
            r++
        ) {

            const serialized =
                JSON.stringify(
                    working
                );


            if (
                !result.some(
                    item =>
                        JSON.stringify(
                            item
                        ) ===
                        serialized
                )
            ) {

                result.push(
                    clone(
                        working
                    )
                );

            }


            working =
                rotate(
                    working
                );

        }

    }


    return result;

}


/* =========================================================
   VYTVOŘENÍ DÍLKŮ
========================================================= */

function createPieces() {

    pieces =
        BASE_SHAPES.map(
            (shape,index) => {

                return {

                    id:
                        index + 1,

                    shape:
                        normalize(
                            shape
                        ),

                    originalShape:
                        normalize(
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

}


/* =========================================================
   VELIKOST PLOCHY
========================================================= */

function setBoardSize() {

    const rule =
        DIFFICULTY[
            difficulty
        ];


    W =
        rule.width;


    H =
        rule.height;


    if (board) {

        board.style.setProperty(
            "--board-columns",
            W
        );


        board.style.setProperty(
            "--board-rows",
            H
        );

    }


    if (preview) {

        preview.style.setProperty(
            "--board-columns",
            W
        );


        preview.style.setProperty(
            "--board-rows",
            H
        );

    }

}


/* =========================================================
   GENEROVÁNÍ ŘEŠENÍ
========================================================= */

function generateSolution() {

    /*
        Díly řadíme od největšího.
    */

    const order =
        [...pieces]

            .sort(
                (a,b) =>
                    b.shape.length -
                    a.shape.length
            )

            .map(
                p =>
                    p.id
            );


    const placements =
        new Array(
            pieces.length
        );


    const occupiedCells =
        new Set();


    let nodes =
        0;


    const MAX_NODES =
        80000;


    function solve(
        index
    ) {

        nodes++;


        if (
            nodes >
            MAX_NODES
        ) {

            return false;

        }


        if (
            index >=
            order.length
        ) {

            return true;

        }


        const id =
            order[index];


        const piece =
            pieces[
                id - 1
            ];


        let candidates = [];


        const shapeVariants =
            shuffle(
                getVariants(
                    piece.shape
                )
            );


        for (
            const shape
            of shapeVariants
        ) {

            const {
                w,
                h
            } =
                dimensions(
                    shape
                );


            if (
                w > W ||
                h > H
            ) {

                continue;

            }


            for (
                let y = 0;
                y <= H - h;
                y++
            ) {

                for (
                    let x = 0;
                    x <= W - w;
                    x++
                ) {

                    let valid =
                        true;


                    for (
                        const [
                            dx,
                            dy
                        ]
                        of shape
                    ) {

                        if (
                            occupiedCells.has(
                                key(
                                    x + dx,
                                    y + dy
                                )
                            )
                        ) {

                            valid =
                                false;

                            break;

                        }

                    }


                    if (valid) {

                        candidates.push({

                            shape:
                                shape,

                            x:
                                x,

                            y:
                                y

                        });

                    }

                }

            }

        }


        candidates =
            shuffle(
                candidates
            );


        /*
            Omezení počtu kandidátů.
        */

        if (
            candidates.length >
            100
        ) {

            candidates =
                candidates.slice(
                    0,
                    100
                );

        }


        for (
            const candidate
            of candidates
        ) {

            const cells =
                candidate.shape.map(
                    ([dx,dy]) =>
                        key(
                            candidate.x + dx,
                            candidate.y + dy
                        )
                );


            cells.forEach(
                c =>
                    occupiedCells.add(
                        c
                    )
            );


            placements[
                id - 1
            ] = {

                id:
                    id,

                shape:
                    clone(
                        candidate.shape
                    ),

                x:
                    candidate.x,

                y:
                    candidate.y

            };


            if (
                solve(
                    index + 1
                )
            ) {

                return true;

            }


            cells.forEach(
                c =>
                    occupiedCells.delete(
                        c
                    )
            );


            placements[
                id - 1
            ] =
                null;

        }


        return false;

    }


    if (
        !solve(0)
    ) {

        return null;

    }


    return placements;

}


/* =========================================================
   VYTVOŘENÍ NOVÉHO ŘEŠENÍ
========================================================= */

function buildSolution() {

    /*
        Několik pokusů.
    */

    for (
        let attempt = 0;
        attempt < 8;
        attempt++
    ) {

        const result =
            generateSolution();


        if (result) {

            return result;

        }

    }


    return null;

}


/* =========================================================
   CÍLOVÝ TVAR
========================================================= */

function createTarget() {

    target.clear();


    solution.forEach(
        placement => {

            placement.shape.forEach(
                ([dx,dy]) => {

                    target.add(
                        key(
                            placement.x + dx,
                            placement.y + dy
                        )
                    );

                }
            );

        }
    );

}


/* =========================================================
   NÁHODNÁ OBTÍŽNOST
========================================================= */

function chooseRandomDifficulty() {

    const r =
        Math.random();


    if (
        r < 0.10
    ) {

        return "veryEasy";

    }


    if (
        r < 0.35
    ) {

        return "easy";

    }


    if (
        r < 0.70
    ) {

        return "medium";

    }


    if (
        r < 0.93
    ) {

        return "hard";

    }


    return "expert";

}


/* =========================================================
   PŘEDVYPLNĚNÍ DÍLKŮ
========================================================= */

function preplacePieces() {

    const rule =
        DIFFICULTY[
            difficulty
        ];


    preplaced =
        Math.floor(
            Math.random() *
            (
                rule.max -
                rule.min +
                1
            )
        )
        +
        rule.min;


    const ids =
        shuffle(
            pieces.map(
                p =>
                    p.id
            )
        );


    const fixedIds =
        new Set(
            ids.slice(
                0,
                preplaced
            )
        );


    pieces.forEach(
        piece => {

            const solved =
                solution[
                    piece.id - 1
                ];


            if (
                fixedIds.has(
                    piece.id
                )
            ) {

                piece.shape =
                    clone(
                        solved.shape
                    );


                piece.x =
                    solved.x;


                piece.y =
                    solved.y;


                piece.placed =
                    true;


                piece.fixed =
                    true;

            }

        }
    );

}


/* =========================================================
   HRACÍ PLOCHA
========================================================= */

function createBoard() {

    if (!board) {
        return;
    }


    board.innerHTML =
        "";


    for (
        let y = 0;
        y < H;
        y++
    ) {

        for (
            let x = 0;
            x < W;
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


/* =========================================================
   OBSAZENÉ BUŇKY
========================================================= */

function getOccupied(
    excludeId = null
) {

    const occupied =
        new Set();


    pieces.forEach(
        piece => {

            if (
                !piece.placed
            ) {

                return;

            }


            if (
                piece.id ===
                excludeId
            ) {

                return;

            }


            piece.shape.forEach(
                ([dx,dy]) => {

                    occupied.add(
                        key(
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


/* =========================================================
   KONTROLA, ZDA SE DÍLEK VEJDE
========================================================= */

function canPlace(
    piece,
    x,
    y
) {

    const {
        w,
        h
    } =
        dimensions(
            piece.shape
        );


    if (
        x < 0 ||
        y < 0 ||
        x + w > W ||
        y + h > H
    ) {

        return false;

    }


    const occupied =
        getOccupied(
            piece.id
        );


    return piece.shape.every(
        ([dx,dy]) =>
            !occupied.has(
                key(
                    x + dx,
                    y + dy
                )
            )
    );

}


/* =========================================================
   POZICE PRSTU / MYŠI
========================================================= */

function pointerToCell(
    event
) {

    if (!board) {

        return {
            x: 0,
            y: 0
        };

    }


    const rect =
        board.getBoundingClientRect();


    const relativeX =
        event.clientX -
        rect.left;


    const relativeY =
        event.clientY -
        rect.top;


    let x =
        Math.floor(
            relativeX /
            rect.width *
            W
        );


    let y =
        Math.floor(
            relativeY /
            rect.height *
            H
        );


    x =
        Math.max(
            0,
            Math.min(
                W - 1,
                x
            )
        );


    y =
        Math.max(
            0,
            Math.min(
                H - 1,
                y
            )
        );


    return {
        x,
        y
    };

}


/* =========================================================
   START TAŽENÍ
========================================================= */

function startDrag(
    event,
    piece
) {

    if (
        piece.fixed
    ) {

        setMessage(
            "Tento dílek je součástí zadání."
        );


        return;

    }


    event.preventDefault();

    event.stopPropagation();


    selectedId =
        piece.id;


    /*
        Zapamatujeme původní pozici.
        Pokud bude nové místo kolidovat,
        vrátíme dílek zpět.
    */

    dragState = {

        id:
            piece.id,

        pointerId:
            event.pointerId,

        oldX:
            piece.x,

        oldY:
            piece.y,

        oldPlaced:
            piece.placed

    };


    try {

        event.currentTarget.setPointerCapture(
            event.pointerId
        );

    } catch (_) {}


    /*
        Důležité pro mobil:
        zabráníme posouvání stránky.
    */

    if (
        board
    ) {

        board.style.touchAction =
            "none";

    }


    document.addEventListener(
        "pointermove",
        handleDragMove,
        {
            passive: false
        }
    );


    document.addEventListener(
        "pointerup",
        finishDrag,
        {
            once: true
        }
    );


    document.addEventListener(
        "pointercancel",
        cancelDrag,
        {
            once: true
        }
    );


    setMessage(
        `Přesouváš dílek ${piece.id}.`
    );

}


/* =========================================================
   POHYB BĚHEM TAŽENÍ
========================================================= */

function handleDragMove(
    event
) {

    if (!dragState) {

        return;

    }


    event.preventDefault();


    const piece =
        pieces.find(
            p =>
                p.id ===
                dragState.id
        );


    if (!piece) {

        return;

    }


    const position =
        pointerToCell(
            event
        );


    const {
        w,
        h
    } =
        dimensions(
            piece.shape
        );


    let x =
        position.x -
        Math.floor(
            w / 2
        );


    let y =
        position.y -
        Math.floor(
            h / 2
        );


    /*
        Zde je důležitá oprava.

        Během tažení NEKONTROLUJEME
        kolizi.

        Dílek se může volně pohybovat
        po celé ploše.

        Kolize se kontroluje až
        při puštění.
    */

    x =
        Math.max(
            0,
            Math.min(
                W - w,
                x
            )
        );


    y =
        Math.max(
            0,
            Math.min(
                H - h,
                y
            )
        );


    piece.x =
        x;


    piece.y =
        y;


    piece.placed =
        true;


    renderBoardOnly();

}


/* =========================================================
   KONEC TAŽENÍ
========================================================= */

function finishDrag(
    event
) {

    if (!dragState) {

        return;

    }


    const piece =
        pieces.find(
            p =>
                p.id ===
                dragState.id
        );


    if (!piece) {

        dragState =
            null;

        return;

    }


    /*
        Nyní teprve kontrolujeme,
        zda je místo volné.
    */

    if (
        !canPlace(
            piece,
            piece.x,
            piece.y
        )
    ) {

        piece.x =
            dragState.oldX;


        piece.y =
            dragState.oldY;


        piece.placed =
            dragState.oldPlaced;


        setMessage(
            "Dílek se překrývá s jiným dílkem – vrácen zpět.",
            "bad"
        );

    } else {

        moves++;


        setMessage(
            `Dílek ${piece.id} umístěn.`
        );

    }


    dragState =
        null;


    document.removeEventListener(
        "pointermove",
        handleDragMove
    );


    render();

}


/* =========================================================
   ZRUŠENÍ TAŽENÍ
========================================================= */

function cancelDrag() {

    if (!dragState) {

        return;

    }


    const piece =
        pieces.find(
            p =>
                p.id ===
                dragState.id
        );


    if (piece) {

        piece.x =
            dragState.oldX;


        piece.y =
            dragState.oldY;


        piece.placed =
            dragState.oldPlaced;

    }


    dragState =
        null;


    document.removeEventListener(
        "pointermove",
        handleDragMove
    );


    render();

}


/* =========================================================
   KLIKNUTÍ NA PLOCHU
========================================================= */

function placeSelectedAt(
    x,
    y
) {

    if (
        !selectedId
    ) {

        return;

    }


    const piece =
        pieces.find(
            p =>
                p.id ===
                selectedId
        );


    if (
        !piece ||
        piece.fixed
    ) {

        return;

    }


    const {
        w,
        h
    } =
        dimensions(
            piece.shape
        );


    let nx =
        x -
        Math.floor(
            w / 2
        );


    let ny =
        y -
        Math.floor(
            h / 2
        );


    nx =
        Math.max(
            0,
            Math.min(
                W - w,
                nx
            )
        );


    ny =
        Math.max(
            0,
            Math.min(
                H - h,
                ny
            )
        );


    if (
        canPlace(
            piece,
            nx,
            ny
        )
    ) {

        piece.x =
            nx;


        piece.y =
            ny;


        piece.placed =
            true;


        moves++;


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


/* =========================================================
   RENDER PŘEDLOHY
========================================================= */

function renderTarget() {

    if (!preview) {

        return;

    }


    preview.innerHTML =
        "";


    for (
        let y = 0;
        y < H;
        y++
    ) {

        for (
            let x = 0;
            x < W;
            x++
        ) {

            const cell =
                document.createElement(
                    "div"
                );


            cell.className =
                "target-cell";


            if (
                target.has(
                    key(
                        x,
                        y
                    )
                )
            ) {

                cell.classList.add(
                    "target"
                );

            }


            preview.appendChild(
                cell
            );

        }

    }

}


/* =========================================================
   RENDER DÍLKŮ V ZÁSOBNÍKU
========================================================= */

function renderTray() {

    if (!tray) {

        return;

    }


    tray.innerHTML =
        "";


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
                selectedId
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


            const mini =
                document.createElement(
                    "div"
                );


            mini.className =
                "mini-shape";


            const {
                w,
                h
            } =
                dimensions(
                    piece.shape
                );


            mini.style.width =
                `${w * 21}px`;


            mini.style.height =
                `${h * 21}px`;


            piece.shape.forEach(
                ([x,y]) => {

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


                    mini.appendChild(
                        bead
                    );

                }
            );


            card.appendChild(
                mini
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
                Dotykové ovládání.
            */

            if (
                !piece.fixed
            ) {

                card.addEventListener(
                    "pointerdown",
                    event => {

                        startDrag(
                            event,
                            piece
                        );

                    }
                );


                card.addEventListener(
                    "click",
                    () => {

                        selectedId =
                            piece.id;


                        render();

                    }
                );

            }


            tray.appendChild(
                card
            );

        }
    );

}


/* =========================================================
   RENDER HRACÍ PLOCHY
========================================================= */

function renderBoardOnly() {

    if (!board) {

        return;

    }


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
                    w,
                    h
                } =
                    dimensions(
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
                    selectedId
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
                    `${piece.x + 1} / span ${w}`;


                element.style.gridRow =
                    `${piece.y + 1} / span ${h}`;


                piece.shape.forEach(
                    ([x,y]) => {

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
                            `${x / w * 100}%`;


                        bead.style.top =
                            `${y / h * 100}%`;


                        bead.style.width =
                            `${100 / w}%`;


                        bead.style.height =
                            `${100 / h}%`;


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

                            startDrag(
                                event,
                                piece
                            );

                        }
                    );


                    element.addEventListener(
                        "click",
                        event => {

                            event.stopPropagation();


                            selectedId =
                                piece.id;


                            render();

                        }
                    );

                }


                board.appendChild(
                    element
                );

            }
        );

}


/* =========================================================
   STATISTIKY
========================================================= */

function updateStats() {

    if (movesEl) {

        movesEl.textContent =
            moves;

    }


    if (timerEl) {

        timerEl.textContent =
            formatTime(
                seconds
            );

    }


    if (placedEl) {

        placedEl.textContent =

            `${pieces.filter(
                p =>
                    p.placed
            ).length} / ${pieces.length} dílků`;

    }

}


/* =========================================================
   KOMPLETNÍ RENDER
========================================================= */

function render() {

    renderTray();

    renderBoardOnly();

    updateStats();

}


/* =========================================================
   ČASOMÍRA
========================================================= */

function startTimer() {

    stopTimer();


    timer =
        setInterval(
            () => {

                seconds++;


                updateStats();

            },
            1000
        );

}


function stopTimer() {

    if (timer) {

        clearInterval(
            timer
        );

    }


    timer =
        null;

}


/* =========================================================
   KONTROLA ŘEŠENÍ
========================================================= */

function checkSolution() {

    const allPlaced =
        pieces.every(
            piece =>
                piece.placed
        );


    if (!allPlaced) {

        const missing =
            pieces.filter(
                piece =>
                    !piece.placed
            ).length;


        setMessage(
            `Ještě chybí ${missing} dílků.`,
            "bad"
        );


        return;

    }


    const occupied =
        getOccupied();


    const correct =

        occupied.size ===
        target.size

        &&

        [...target].every(
            cell =>
                occupied.has(
                    cell
                )
        );


    if (!correct) {

        setMessage(
            "Dílky nejsou správně složené podle předlohy.",
            "bad"
        );


        return;

    }


    stopTimer();


    setMessage(
        "🎉 Výborně! Předloha je správně složená.",
        "good"
    );


    showSuccess();

}


/* =========================================================
   ÚSPĚCH
========================================================= */

function showSuccess() {

    const modal =
        $("successModal");


    const text =
        $("successText");


    if (text) {

        text.textContent =
            `Hotovo za ${formatTime(
                seconds
            )} a ${moves} tahů.`;

    }


    if (modal) {

        modal.classList.remove(
            "hidden"
        );

    }


    playSuccessSound();

}


/* =========================================================
   ZVUK
========================================================= */

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


        const context =
            new AudioContext();


        const oscillator =
            context.createOscillator();


        const gain =
            context.createGain();


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
            context.destination
        );


        oscillator.start();


        oscillator.stop(
            context.currentTime +
            0.22
        );

    } catch (_) {}

}


/* =========================================================
   NOVÁ HRA
========================================================= */

function startNewPuzzle(
    requestedDifficulty = null
) {

    stopTimer();


    /*
        Pokud byla zadána obtížnost,
        použijeme ji.
    */

    if (
        requestedDifficulty
        &&
        DIFFICULTY[
            requestedDifficulty
        ]
    ) {

        difficulty =
            requestedDifficulty;

    }


    createPieces();


    /*
        Nastavení velikosti
        ještě před generováním.
    */

    setBoardSize();


    /*
        Vygenerujeme řešení.
    */

    let generated =
        null;


    for (
        let attempt = 0;
        attempt < 8 &&
        !generated;
        attempt++
    ) {

        generated =
            buildSolution();

    }


    if (!generated) {

        setMessage(
            "Nepodařilo se vytvořit nový úkol. Zkus Nová hra znovu.",
            "bad"
        );


        return;

    }


    solution =
        generated;


    createTarget();


    /*
        Předem vložené dílky.
    */

    preplacePieces();


    /*
        Aktualizace velikosti CSS.
    */

    setBoardSize();


    /*
        Aktualizace textu.
    */

    if (badge) {

        badge.textContent =
            DIFFICULTY[
                difficulty
            ].label;

    }


    if (challengeName) {

        challengeName.textContent =

            `${W} × ${H} • ` +
            `předem vloženo ` +
            `${preplaced} z 12 dílků`;

    }


    renderTarget();


    createBoard();


    selectedId =
        null;


    moves =
        0;


    seconds =
        0;


    dragState =
        null;


    render();


    setMessage(

        `Úkol připraven: ` +
        `${W} × ${H}. ` +
        `${preplaced} dílků je již na ploše.`

    );


    startTimer();

}


/* =========================================================
   PŘÍMÁ VOLBA OBTÍŽNOSTI
========================================================= */

function selectDifficulty(
    level
) {

    if (
        !DIFFICULTY[level]
    ) {

        return;

    }


    difficulty =
        level;


    /*
        Nová hra se stejnou
        vybranou obtížností.
    */

    startNewPuzzle(
        level
    );


    /*
        Aktualizujeme aktivní
        tlačítko.
    */

    document
        .querySelectorAll(
            "[data-level]"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.level ===
                    level
                );

            }
        );

}


/* =========================================================
   PŘEPÍNÁNÍ REŽIMŮ
========================================================= */

function switchView(
    view
) {

    if (!view) {

        return;

    }


    currentView =
        view;


    /*
        Přepínání podle ID sekcí.
    */

    const sections = {

        game:
            "game",

        free:
            "freeMode",

        editor:
            "editor",

        records:
            "records"

    };


    /*
        Pokud HTML používá
        jiné názvy, ponecháme
        základní hru viditelnou.
    */

    Object.keys(
        sections
    ).forEach(
        keyName => {

            const section =
                document.getElementById(
                    sections[
                        keyName
                    ]
                );


            if (!section) {

                return;

            }


            section.classList.toggle(
                "hidden",
                keyName !== view
            );

        }
    );


    /*
        Aktivní tlačítko.
    */

    document
        .querySelectorAll(
            "[data-view]"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.view ===
                    view
                );

            }
        );


    /*
        Pokud uživatel zvolí
        Hru, zobrazíme hlavní plochu.
    */

    if (
        view === "game"
    ) {

        const player =
            $("player");


        if (player) {

            player.classList.remove(
                "hidden"
            );

        }

    }

}


/* =========================================================
   OTOČENÍ VYBRANÉHO DÍLKU
========================================================= */

function transformSelected(
    direction
) {

    const piece =
        pieces.find(
            p =>
                p.id ===
                selectedId
        );


    if (
        !piece ||
        piece.fixed
    ) {

        return;

    }


    const oldShape =
        clone(
            piece.shape
        );


    if (
        direction ===
        "right"
    ) {

        piece.shape =
            rotate(
                piece.shape
            );

    }


    if (
        direction ===
        "left"
    ) {

        piece.shape =
            rotate(
                rotate(
                    rotate(
                        piece.shape
                    )
                )
            );

    }


    if (
        direction ===
        "flip"
    ) {

        piece.shape =
            flip(
                piece.shape
            );

    }


    /*
        Pokud je dílek již
        na ploše a nový tvar
        by vyčníval, vrátíme
        starý tvar.
    */

    if (
        piece.placed
        &&
        !canPlace(
            piece,
            piece.x,
            piece.y
        )
    ) {

        piece.shape =
            oldShape;


        setMessage(
            "Tento tvar se na současné místo nevejde.",
            "bad"
        );


        return;

    }


    moves++;


    render();

}


/* =========================================================
   ODSTRANĚNÍ VYBRANÉHO DÍLKU
========================================================= */

function removeSelectedPiece() {

    const piece =
        pieces.find(
            p =>
                p.id ===
                selectedId
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
        `Dílek ${piece.id} byl vrácen do zásobníku.`
    );

}


/* =========================================================
   POSUN VYBRANÉHO DÍLKU
========================================================= */

function moveSelected(
    dx,
    dy
) {

    const piece =
        pieces.find(
            p =>
                p.id ===
                selectedId
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


    /*
        Klávesnicí dovolíme pohyb
        pouze na volné místo.
    */

    if (
        canPlace(
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


/* =========================================================
   KLÁVESNICE
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        const tag =
            document.activeElement
                ?.tagName;


        if (
            [
                "INPUT",
                "TEXTAREA",
                "SELECT"
            ].includes(
                tag
            )
        ) {

            return;

        }


        switch (
            event.key
        ) {

            case "ArrowLeft":

                event.preventDefault();

                moveSelected(
                    -1,
                    0
                );

                break;


            case "ArrowRight":

                event.preventDefault();

                moveSelected(
                    1,
                    0
                );

                break;


            case "ArrowUp":

                event.preventDefault();

                moveSelected(
                    0,
                    -1
                );

                break;


            case "ArrowDown":

                event.preventDefault();

                moveSelected(
                    0,
                    1
                );

                break;


            case "Delete":

            case "Backspace":

                event.preventDefault();

                removeSelectedPiece();

                break;


            case "r":

            case "R":

                transformSelected(
                    "right"
                );

                break;


            case "e":

            case "E":

                transformSelected(
                    "left"
                );

                break;


            case "f":

            case "F":

                transformSelected(
                    "flip"
                );

                break;

        }

    }
);


/* =========================================================
   TLAČÍTKA – NOVÁ HRA
========================================================= */

$("newGame")
    ?.addEventListener(
        "click",
        () => {

            startNewPuzzle(
                difficulty
            );

        }
    );


/* =========================================================
   TLAČÍTKO KONTROLA
========================================================= */

$("checkButton")
    ?.addEventListener(
        "click",
        checkSolution
    );


/* =========================================================
   RESTART
========================================================= */

$("resetButton")
    ?.addEventListener(
        "click",
        () => {

            startNewPuzzle(
                difficulty
            );

        }
    );


/* =========================================================
   OTOČENÍ VLEVO
========================================================= */

$("rotateLeft")
    ?.addEventListener(
        "click",
        () => {

            transformSelected(
                "left"
            );

        }
    );


/* =========================================================
   OTOČENÍ VPRAVO
========================================================= */

$("rotateRight")
    ?.addEventListener(
        "click",
        () => {

            transformSelected(
                "right"
            );

        }
    );


/* =========================================================
   PŘEKLOPENÍ
========================================================= */

$("flipPiece")
    ?.addEventListener(
        "click",
        () => {

            transformSelected(
                "flip"
            );

        }
    );


/* =========================================================
   ODSTRANĚNÍ DÍLKU
========================================================= */

$("removePiece")
    ?.addEventListener(
        "click",
        removeSelectedPiece
    );


/*
   Pokud HTML používá
   jiné ID pro tlačítko
   odstranění, podporujeme
   i #deletePiece.
*/

$("deletePiece")
    ?.addEventListener(
        "click",
        removeSelectedPiece
    );


/* =========================================================
   VYČIŠTĚNÍ PLOCHY
========================================================= */

$("clearBoard")
    ?.addEventListener(
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
                "Pohyblivé dílky byly vráceny do zásobníku."
            );

        }
    );


/* =========================================================
   ZVUK
========================================================= */

$("soundButton")
    ?.addEventListener(
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


/* =========================================================
   ÚSPĚCH – ZAVŘÍT
========================================================= */

$("closeSuccess")
    ?.addEventListener(
        "click",
        () => {

            $("successModal")
                ?.classList
                .add(
                    "hidden"
                );

        }
    );


/* =========================================================
   ÚSPĚCH – DALŠÍ ÚKOL
========================================================= */

$("nextChallenge")
    ?.addEventListener(
        "click",
        () => {

            $("successModal")
                ?.classList
                .add(
                    "hidden"
                );


            startNewPuzzle(
                difficulty
            );

        }
    );


/* =========================================================
   PŘEPÍNÁNÍ OBTÍŽNOSTI
========================================================= */

/*
    Podporuje například:

    <button data-level="easy">
    <button data-level="medium">
    <button data-level="hard">
*/

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "[data-level]"
            );


        if (!button) {

            return;

        }


        event.preventDefault();


        const level =
            button.dataset.level;


        selectDifficulty(
            level
        );

    }
);


/* =========================================================
   PŘEPÍNÁNÍ REŽIMŮ
========================================================= */

/*
    Podporuje například:

    data-view="game"
    data-view="free"
    data-view="editor"
    data-view="records"
*/

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "[data-view]"
            );


        if (!button) {

            return;

        }


        event.preventDefault();


        switchView(
            button.dataset.view
        );

    }
);


/* =========================================================
   PODPORA PRO DATA-VIEW
========================================================= */

/*
    Některé starší verze HTML
    používají:

    data-view="play"
    data-view="free"
*/

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "[data-view]"
            );


        if (!button) {

            return;

        }


        const value =
            button.dataset.view;


        if (
            value ===
            "play"
        ) {

            switchView(
                "game"
            );

        }


        if (
            value ===
            "volne"
        ) {

            switchView(
                "free"
            );

        }

    }
);


/* =========================================================
   OBTÍŽNOST – STARŠÍ HTML
========================================================= */

/*
    Pokud tlačítka používají:

    data-level="easy"
    data-level="medium"
    data-level="hard"

    funguje vše automaticky.

    Přidáváme také podporu
    pro tlačítka podle textu / ID.
*/

$("easyButton")
    ?.addEventListener(
        "click",
        () =>
            selectDifficulty(
                "easy"
            )
    );


$("mediumButton")
    ?.addEventListener(
        "click",
        () =>
            selectDifficulty(
                "medium"
            )
    );


$("hardButton")
    ?.addEventListener(
        "click",
        () =>
            selectDifficulty(
                "hard"
            )
    );


$("veryEasyButton")
    ?.addEventListener(
        "click",
        () =>
            selectDifficulty(
                "veryEasy"
            )
    );


$("expertButton")
    ?.addEventListener(
        "click",
        () =>
            selectDifficulty(
                "expert"
            )
    );


/* =========================================================
   INSTALACE PWA
========================================================= */

let deferredInstallPrompt =
    null;


window.addEventListener(
    "beforeinstallprompt",
    event => {

        event.preventDefault();


        deferredInstallPrompt =
            event;


        const installButton =
            $("install");


        if (installButton) {

            installButton.classList.remove(
                "hidden"
            );

        }

    }
);


$("install")
    ?.addEventListener(
        "click",
        async () => {

            if (
                !deferredInstallPrompt
            ) {

                return;

            }


            deferredInstallPrompt.prompt();


            await deferredInstallPrompt.userChoice;


            deferredInstallPrompt =
                null;

        }
    );


/* =========================================================
   SERVICE WORKER
========================================================= */

if (
    "serviceWorker"
    in navigator
) {

    window.addEventListener(
        "load",
        () => {

            navigator.serviceWorker
                .register(
                    "./sw.js"
                )
                .catch(
                    error =>
                        console.warn(
                            "Service Worker:",
                            error
                        )
                );

        }
    );

}


/* =========================================================
   START APLIKACE
========================================================= */

function boot() {

    try {

        if (!board) {

            console.error(
                "Chybí #board v index.html."
            );


            return;

        }


        /*
            Výchozí obtížnost.
        */

        difficulty =
            "medium";


        createPieces();


        setBoardSize();


        createBoard();


        /*
            Spustíme první hru.
        */

        startNewPuzzle(
            difficulty
        );


        /*
            Výchozí aktivní
            tlačítko Střední.
        */

        document
            .querySelectorAll(
                "[data-level]"
            )
            .forEach(
                button => {

                    button.classList.toggle(
                        "active",
                        button.dataset.level ===
                        difficulty
                    );

                }
            );


        console.log(
            "KULIČKOVÉ TVARY PRO – spuštěno."
        );

    } catch (error) {

        console.error(
            "Chyba při spuštění aplikace:",
            error
        );


        setMessage(
            "Aplikaci se nepodařilo spustit. Obnov stránku.",
            "bad"
        );

    }

}


/* =========================================================
   DOM READY
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        boot
    );

} else {

    boot();

}
