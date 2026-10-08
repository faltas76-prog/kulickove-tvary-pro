/* =========================================================
   KULIČKOVÉ TVARY PRO – MOBILE SAFE
   Opravený start + bezpečný generátor řešení
   ========================================================= */

"use strict";

let W = 12;
let H = 10;


/* =========================================================
   BARVY
========================================================= */

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


/* =========================================================
   ZÁKLADNÍ TVARY DÍLKŮ
========================================================= */

const BASE_SHAPES = [

    [[0,0],[1,0],[2,0],[3,0]],

    [[0,0],[0,1],[1,1],[2,1]],

    [[0,0],[1,0],[0,1],[1,1]],

    [[0,0],[1,0],[2,0],[1,1]],

    [[0,0],[0,1],[0,2],[1,2]],

    [[0,0],[1,0],[1,1],[2,1]],

    [[0,0],[1,0],[2,0],[2,1]],

    [[0,0],[1,0],[1,1],[2,1],[1,2]],

    [[0,0],[0,1],[1,1],[2,1],[2,2]],

    [[0,0],[1,0],[1,1],[1,2],[2,2]],

    [[0,0],[0,1],[1,1],[1,2]],

    [[0,0],[1,0],[2,0],[1,1],[1,2]]

];


/* =========================================================
   OBTÍŽNOST
========================================================= */

const DIFFICULTY = {

    veryEasy: {
        min: 8,
        max: 9,
        label: "VELMI LEHKÁ"
    },

    easy: {
        min: 6,
        max: 7,
        label: "LEHKÁ"
    },

    medium: {
        min: 4,
        max: 5,
        label: "STŘEDNÍ"
    },

    hard: {
        min: 2,
        max: 3,
        label: "TĚŽKÁ"
    },

    expert: {
        min: 1,
        max: 1,
        label: "EXPERT"
    }

};

/* =========================================================
   STAV HRY
========================================================= */

let pieces = [];

let solution = [];

let target = new Set();

let selectedId = null;

let dragging = null;

let difficulty = "medium";

let preplaced = 0;

let moves = 0;

let seconds = 0;

let timer = null;

let sound = true;


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

function key(x, y) {

    return `${x},${y}`;

}


function clone(value) {

    return JSON.parse(
        JSON.stringify(value)
    );

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


function rotate(shape) {

    return normalize(
        shape.map(
            ([x, y]) => [
                -y,
                x
            ]
        )
    );

}


function flip(shape) {

    return normalize(
        shape.map(
            ([x, y]) => [
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


function formatTime(value) {

    return (

        String(
            Math.floor(
                value / 60
            )
        ).padStart(
            2,
            "0"
        )

        +

        ":" +

        String(
            value % 60
        ).padStart(
            2,
            "0"
        )

    );

}


/* =========================================================
   VARIANTY TVARŮ
========================================================= */

function variants(shape) {

    const result = [];

    let current =
        normalize(shape);


    for (
        let flipIndex = 0;
        flipIndex < 2;
        flipIndex++
    ) {

        let working =
            flipIndex
                ? flip(current)
                : current;


        for (
            let rotation = 0;
            rotation < 4;
            rotation++
        ) {

            const serialized =
                JSON.stringify(
                    working
                );


            if (
                !result.some(
                    item =>
                        JSON.stringify(item) ===
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
            (shape, index) => {

                return {

                    id:
                        index + 1,

                    shape:
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
   GENERÁTOR ŘEŠENÍ
========================================================= */

/*
    Bezpečný backtracking.

    Původní rekurzivní generátor mohl
    na mobilu běžet příliš dlouho.

    Zde je počet výpočtů omezen.
*/

function generateSolution() {

    const order =
        [...pieces]

            .sort(
                (a, b) =>
                    b.shape.length -
                    a.shape.length
            )

            .map(
                p => p.id
            );


    const placements =
        new Array(
            pieces.length
        );


    const occupied =
        new Set();


    let nodes = 0;


    const MAX_NODES =
        120000;


    function tryPlace(
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
            pieces[id - 1];


        let candidates = [];


        for (
            const shape
            of shuffle(
                variants(
                    piece.shape
                )
            )
        ) {

            const {
                w,
                h
            } =
                dimensions(
                    shape
                );


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
                            occupied.has(
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
                            shape,
                            x,
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
            Omezíme počet kandidátů.
        */

        if (
            candidates.length >
            140
        ) {

            candidates =
                candidates.slice(
                    0,
                    140
                );

        }


        for (
            const candidate
            of candidates
        ) {

            const cells =
                candidate.shape.map(
                    ([dx, dy]) =>
                        key(
                            candidate.x + dx,
                            candidate.y + dy
                        )
                );


            cells.forEach(
                cell =>
                    occupied.add(
                        cell
                    )
            );


            placements[
                id - 1
            ] = {

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
                tryPlace(
                    index + 1
                )
            ) {

                return true;

            }


            cells.forEach(
                cell =>
                    occupied.delete(
                        cell
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
        !tryPlace(0)
    ) {

        return null;

    }


    return placements;

}


/* =========================================================
   VYTVOŘENÍ PUZZLE
========================================================= */

function buildPuzzle() {

    for (
        let attempt = 0;
        attempt < 12;
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


    for (
        const piece
        of solution
    ) {

        for (
            const [
                dx,
                dy
            ]
            of piece.shape
        ) {

            target.add(
                key(
                    piece.x + dx,
                    piece.y + dy
                )
            );

        }

    }

}


/* =========================================================
   OBTÍŽNOST
========================================================= */

function chooseDifficulty() {

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

/* =========================================================
   VELIKOST HRACÍ PLOCHY PODLE OBTÍŽNOSTI
========================================================= */

function setBoardSize() {

    const rule =
        DIFFICULTY[difficulty];

    W = rule.width;
    H = rule.height;


    /*
        Předáme velikost také CSS.
        Díky tomu nemusíme mít
        pevně nastavených 12 sloupců.
    */

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
   PŘEDEM UMÍSTĚNÉ DÍLKY
========================================================= */

function preplacePieces() {

    const rule =
        DIFFICULTY[
            difficulty        ];


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
                piece =>
                    piece.id
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

function occupied(
    excludeId = null
) {

    const result =
        new Set();


    pieces.forEach(
        piece => {

            if (
                !piece.placed ||
                piece.id ===
                excludeId
            ) {

                return;

            }


            piece.shape.forEach(
                ([dx, dy]) => {

                    result.add(
                        key(
                            piece.x + dx,
                            piece.y + dy
                        )
                    );

                }
            );

        }
    );


    return result;

}


/* =========================================================
   KONTROLA UMÍSTĚNÍ
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


    const used =
        occupied(
            piece.id
        );


    return piece.shape.every(
        ([dx, dy]) =>
            !used.has(
                key(
                    x + dx,
                    y + dy
                )
            )
    );

}


/* =========================================================
   PŘEVOD PRSTU NA BUŇKU
========================================================= */

function pointerCell(
    event
) {

    const rect =
        board.getBoundingClientRect();


    return {

        x:
            Math.floor(
                (
                    event.clientX -
                    rect.left
                )
                /
                rect.width
                *
                W
            ),

        y:
            Math.floor(
                (
                    event.clientY -
                    rect.top
                )
                /
                rect.height
                *
                H
            )

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
            `Dílek ${piece.id} je již součástí zadání.`
        );

        return;

    }


    event.preventDefault();

    event.stopPropagation();


    selectedId =
        piece.id;


    try {

        event.currentTarget.setPointerCapture(
            event.pointerId
        );

    } catch (_) {}


    dragging = {

        id:
            piece.id,

        pointerId:
            event.pointerId

    };


    document.addEventListener(
        "pointermove",
        dragMove,
        {
            passive: false
        }
    );


    document.addEventListener(
        "pointerup",
        endDrag,
        {
            once: true
        }
    );


    document.addEventListener(
        "pointercancel",
        endDrag,
        {
            once: true
        }
    );


    setMessage(
        `Přesouváš dílek ${piece.id}…`
    );

}


/* =========================================================
   POHYB DÍLKU
========================================================= */

function dragMove(
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
                dragging.id
        );


    if (!piece) {

        return;

    }


    const position =
        pointerCell(
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
        POHYB PO CELÉ PLOŠE.
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


    if (
        canPlace(
            piece,
            x,
            y
        )
    ) {

        piece.x =
            x;


        piece.y =
            y;


        piece.placed =
            true;


        render();

    }

}


/* =========================================================
   KONEC TAŽENÍ
========================================================= */

function endDrag() {

    document.removeEventListener(
        "pointermove",
        dragMove
    );


    dragging =
        null;

}


/* =========================================================
   UMÍSTĚNÍ KLEPNUTÍM
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
        !canPlace(
            piece,
            nx,
            ny
        )
    ) {

        setMessage(
            "Na tomto místě už je jiný dílek.",
            "bad"
        );


        return;

    }


    piece.x =
        nx;


    piece.y =
        ny;


    piece.placed =
        true;


    moves++;


    render();

}


/* =========================================================
   RENDER – ZÁSOBNÍK
========================================================= */

function renderTray() {

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


            if (
                !piece.fixed
            ) {

                card.addEventListener(
                    "pointerdown",
                    event =>
                        startDrag(
                            event,
                            piece
                        )
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
   RENDER – HRACÍ PLOCHA
========================================================= */

function renderBoard() {

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
                        event =>
                            startDrag(
                                event,
                                piece
                            )
                    );


                    element.addEventListener(
                        "click",
                        () => {

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


    placedEl.textContent =
        `${pieces.filter(
            p => p.placed
        ).length} / 12 dílků`;

}


/* =========================================================
   RENDER
========================================================= */

function render() {

    renderTray();

    renderBoard();

    updateStats();

}


/* =========================================================
   PŘEDLOHA
========================================================= */

function renderTarget() {

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

}


/* =========================================================
   ČAS
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


    const used =
        occupied();


    const correct =
        used.size ===
            target.size &&

        [...target].every(
            cell =>
                used.has(
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


    stopTimer();


    setMessage(
        "Výborně! Úkol je správně složený.",
        "good"
    );


    const modal =
        $("successModal");


    if (modal) {

        const text =
            $("successText");


        if (text) {

            text.textContent =
                `Hotovo za ${formatTime(
                    seconds
                )} a ${moves} tahů.`;

        }


        modal.classList.remove(
            "hidden"
        );

    }


    playSuccess();

}


/* =========================================================
   NOVÁ HRA
========================================================= */

function startNewPuzzle() {

    stopTimer();


    createPieces();


    let generated =
        null;


    /*
        Maximálně 5 pokusů.
    */

    for (
        let i = 0;
        i < 5 &&
        !generated;
        i++
    ) {

        generated =
            buildPuzzle();

    }


    if (!generated) {

        setMessage(
            "Nepodařilo se vytvořit úkol. Klepni na Nová hra znovu.",
            "bad"
        );


        return;

    }


    solution =
        generated;


    createTarget();


    difficulty =
    chooseDifficulty();


/*
    Nastavení velikosti plochy
    podle obtížnosti.
*/

setBoardSize();


preplacePieces();


    if (badge) {

        badge.textContent =
            DIFFICULTY[
                difficulty
            ].label;

    }


    if (challengeName) {

        challengeName.textContent =
            `Předem vloženo ${preplaced} z 12 dílků`;

    }


    renderTarget();


    createBoard();


    moves =
        0;


    seconds =
        0;


    selectedId =
        null;


    render();


    setMessage(
        `Úkol připraven. ${preplaced} dílků je již na ploše.`
    );


    startTimer();

}


/* =========================================================
   OTOČENÍ / PŘEKLOPENÍ
========================================================= */

function transformSelected(
    type
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


    const old =
        clone(
            piece.shape
        );


    if (
        type === "right"
    ) {

        piece.shape =
            rotate(
                piece.shape
            );

    }


    if (
        type === "left"
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
        type === "flip"
    ) {

        piece.shape =
            flip(
                piece.shape
            );

    }


    if (
        piece.placed &&
        !canPlace(
            piece,
            piece.x,
            piece.y
        )
    ) {

        piece.shape =
            old;


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
   POSUN KLÁVESNICÍ
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


    const x =
        piece.x + dx;


    const y =
        piece.y + dy;


    if (
        canPlace(
            piece,
            x,
            y
        )
    ) {

        piece.x =
            x;


        piece.y =
            y;


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
                "SELECT",
                "TEXTAREA"
            ].includes(
                tag
            )
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


        if (
            event.key.toLowerCase() ===
            "r"
        ) {

            transformSelected(
                "right"
            );

        }


        if (
            event.key.toLowerCase() ===
            "e"
        ) {

            transformSelected(
                "left"
            );

        }


        if (
            event.key.toLowerCase() ===
            "f"
        ) {

            transformSelected(
                "flip"
            );

        }

    }
);


/* =========================================================
   TLAČÍTKA
========================================================= */

$("newGame")
    ?.addEventListener(
        "click",
        startNewPuzzle
    );


$("checkButton")
    ?.addEventListener(
        "click",
        checkSolution
    );


$("resetButton")
    ?.addEventListener(
        "click",
        startNewPuzzle
    );


$("rotateLeft")
    ?.addEventListener(
        "click",
        () =>
            transformSelected(
                "left"
            )
    );


$("rotateRight")
    ?.addEventListener(
        "click",
        () =>
            transformSelected(
                "right"
            )
    );


$("flipPiece")
    ?.addEventListener(
        "click",
        () =>
            transformSelected(
                "flip"
            )
    );


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

        }
    );


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


$("nextChallenge")
    ?.addEventListener(
        "click",
        () => {

            $("successModal")
                ?.classList
                .add(
                    "hidden"
                );


            startNewPuzzle();

        }
    );


$("soundButton")
    ?.addEventListener(
        "click",
        event => {

            sound =
                !sound;


            event.currentTarget.textContent =
                sound
                    ? "🔊 Zvuk"
                    : "🔇 Zvuk";

        }
    );


/* =========================================================
   ZVUK
========================================================= */

function playSuccess() {

    if (!sound) {

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
            0.2
        );

    } catch (_) {}

}


/* =========================================================
   SPUŠTĚNÍ APLIKACE
========================================================= */

/*
    TOTO JE DŮLEŽITÁ OPRAVA.

    Aplikace se nespustí dříve,
    než je kompletně načtený HTML dokument.
*/

function boot() {

    try {

        if (
            !board ||
            !tray ||
            !preview
        ) {

            console.error(
                "Kuličkové Tvary PRO: chybí HTML prvky."
            );


            return;

        }


        createPieces();


        createBoard();


        startNewPuzzle();


        console.log(
            "Kuličkové Tvary PRO – aplikace spuštěna."
        );

    } catch (error) {

        console.error(
            "Chyba při spuštění:",
            error
        );


        setMessage(
            "Aplikaci se nepodařilo spustit. Obnov stránku.",
            "bad"
        );

    }

}


/*
    Bezpečné spuštění.
*/

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
