```javascript
import { startAnonymousAuth } from "./auth.js";

import {
    doc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import { db } from "./firebase.js";



/* =========================
   ELEMENTS
========================= */

const uidElement =
    document.getElementById("user-uid");

const statusElement =
    document.getElementById("auth-status");

const dateElement =
    document.getElementById("today-date");



/* =========================
   DATE
========================= */

function displayToday() {

    const now = new Date();


    const year =
        now.getFullYear();


    const month =
        now.getMonth() + 1;


    const date =
        now.getDate();


    const weekdayNames = [
        "日",
        "月",
        "火",
        "水",
        "木",
        "金",
        "土"
    ];


    const weekday =
        weekdayNames[
            now.getDay()
        ];


    dateElement.textContent =
        `${year}年${month}月${date}日（${weekday}）`;

}


displayToday();



/* =========================
   AUTH
========================= */

startAnonymousAuth(async (user) => {


    console.log(
        "LIFE DASHBOARD 起動"
    );


    console.log(
        "User UID:",
        user.uid
    );



    /* =========================
       UID DISPLAY
    ========================= */

    uidElement.textContent =
        user.uid;



    /* =========================
       ONLINE
    ========================= */

    statusElement.textContent =
        "ONLINE";



    /* =========================
       FIRESTORE
    ========================= */

    try {


        await setDoc(

            doc(
                db,
                "users",
                user.uid
            ),

            {

                accountType:
                    "anonymous",

                lastLoginAt:
                    serverTimestamp()

            },

            {

                merge: true

            }

        );


        console.log(
            "Firestore接続成功"
        );


    } catch (error) {


        console.error(
            "Firestore接続失敗:",
            error
        );

    }

});
```
