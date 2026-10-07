/* =========================================================
   KULIČKOVÉ TVARY PRO
   SERVICE WORKER – VERZE 2.2
========================================================= */

const CACHE_NAME =
    "kulickove-tvary-pro-2-2";


const FILES = [

    "./",

    "./index.html",

    "./style.css",

    "./app.js",

    "./manifest.webmanifest",

    "./icon.svg"

];


/* =========================================================
   INSTALACE
========================================================= */

self.addEventListener(
    "install",
    event => {

        /*
            Aktivuj novou verzi okamžitě.
        */

        self.skipWaiting();


        event.waitUntil(

            caches
                .open(
                    CACHE_NAME
                )

                .then(
                    cache =>
                        cache.addAll(
                            FILES
                        )
                )

        );

    }
);


/* =========================================================
   AKTIVACE
========================================================= */

self.addEventListener(
    "activate",
    event => {

        event.waitUntil(

            caches
                .keys()

                .then(
                    keys =>

                        Promise.all(

                            keys

                                .filter(
                                    key =>
                                        key !==
                                        CACHE_NAME
                                )

                                .map(
                                    key =>
                                        caches.delete(
                                            key
                                        )
                                )

                        )

                )

                .then(
                    () =>
                        self.clients.claim()
                )

        );

    }
);


/* =========================================================
   NAČÍTÁNÍ
========================================================= */

self.addEventListener(
    "fetch",
    event => {

        /*
            Řešíme pouze GET.
        */

        if (
            event.request.method !==
            "GET"
        ) {

            return;

        }


        event.respondWith(

            fetch(
                event.request
            )

                .then(
                    response => {

                        /*
                            Uložíme novou verzi
                            do cache.
                        */

                        const copy =
                            response.clone();


                        caches
                            .open(
                                CACHE_NAME
                            )

                            .then(
                                cache =>
                                    cache.put(
                                        event.request,
                                        copy
                                    )
                            );


                        return response;

                    }
                )

                .catch(
                    () =>
                        caches.match(
                            event.request
                        )
                )

        );

    }
);
