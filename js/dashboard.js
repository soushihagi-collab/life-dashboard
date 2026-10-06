import { startAnonymousAuth } from "./auth.js";


import {
    doc,
    setDoc,
    getDoc,
    collection,
    getDocs,
    query,
    where,
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
   TODAY CARD
========================= */

const todayValueElement =
    document.querySelector(
        ".dashboard-card:nth-child(1) .card-main-value"
    );

const todayDetailElement =
    document.querySelector(
        ".dashboard-card:nth-child(1) .card-detail"
    );



/* =========================
   AWS CARD
========================= */

const awsValueElement =
    document.querySelector(
        ".dashboard-card:nth-child(2) .card-main-value"
    );

const awsProgressBar =
    document.querySelector(
        ".dashboard-card:nth-child(2) .progress-bar"
    );

const awsDetailElement =
    document.querySelector(
        ".dashboard-card:nth-child(2) .card-detail"
    );



/* =========================
   GOALS CARD
========================= */

const goalsValueElement =
    document.querySelector(
        ".dashboard-card:nth-child(3) .card-main-value"
    );

const goalsProgressBar =
    document.querySelector(
        ".dashboard-card:nth-child(3) .progress-bar"
    );

const goalsDetailElement =
    document.querySelector(
        ".dashboard-card:nth-child(3) .card-detail"
    );



/* =========================
   LIFE SCORE CARD
========================= */

const scoreElement =
    document.querySelector(
        ".score-number"
    );

const scoreMessageElement =
    document.querySelector(
        ".score-message"
    );



/* =========================
   DATE
========================= */

function displayToday() {

    const now =
        new Date();


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



/* =========================
   DATE KEY
========================= */

function getTodayKey() {

    const now =
        new Date();


    const year =
        now.getFullYear();


    const month =
        String(
            now.getMonth() + 1
        ).padStart(2, "0");


    const date =
        String(
            now.getDate()
        ).padStart(2, "0");


    return `${year}-${month}-${date}`;

}



/* =========================
   SCHEDULE
========================= */

async function loadTodaySchedule(user) {

    try {

        const today =
            getTodayKey();


        const schedulesRef =
            collection(
                db,
                "users",
                user.uid,
                "schedules"
            );


        const scheduleQuery =
            query(
                schedulesRef,
                where(
                    "date",
                    "==",
                    today
                )
            );


        const snapshot =
            await getDocs(
                scheduleQuery
            );


        const schedules =
            snapshot.docs.map(
                (item) => ({
                    id: item.id,
                    ...item.data()
                })
            );


        /* =========================
           件数
        ========================= */

        todayValueElement.textContent =
            schedules.length;


        /* =========================
           次の予定
        ========================= */

        if (
            schedules.length === 0
        ) {

            todayDetailElement.textContent =
                "今日の予定はありません";

            return;

        }


        schedules.sort(
            (a, b) =>
                String(a.time || "")
                .localeCompare(
                    String(b.time || "")
                )
        );


        const nextSchedule =
            schedules[0];


        if (
            nextSchedule.time
        ) {

            todayDetailElement.textContent =
                `次の予定：${nextSchedule.time}`;

        } else {

            todayDetailElement.textContent =
                "今日の予定があります";

        }


    } catch (error) {

        console.error(
            "予定取得失敗:",
            error
        );

    }

}



/* =========================
   AWS
========================= */

async function loadAWSProgress(user) {

    try {

        const awsRef =
            doc(
                db,
                "users",
                user.uid,
                "aws",
                "progress"
            );


        const snapshot =
            await getDoc(
                awsRef
            );


        if (
            !snapshot.exists()
        ) {

            console.log(
                "AWS学習データなし"
            );

            return;

        }


        const data =
            snapshot.data();


        const progress =
            Number(
                data.progress || 0
            );


        const accuracy =
            Number(
                data.accuracy || 0
            );


        awsValueElement.innerHTML =
            `${progress}<span class="unit">%</span>`;


        awsProgressBar.style.width =
            `${Math.min(
                Math.max(progress, 0),
                100
            )}%`;


        awsDetailElement.textContent =
            `正答率 ${accuracy}%`;


    } catch (error) {

        console.error(
            "AWS学習データ取得失敗:",
            error
        );

    }

}



/* =========================
   GOALS
========================= */

async function loadGoals(user) {

    try {

        const goalsRef =
            collection(
                db,
                "users",
                user.uid,
                "goals"
            );


        const snapshot =
            await getDocs(
                goalsRef
            );


        const goals =
            snapshot.docs.map(
                (item) => item.data()
            );


        const total =
            goals.length;


        const completed =
            goals.filter(
                (goal) =>
                    goal.completed === true
            ).length;


        const percentage =
            total === 0
                ? 0
                : Math.round(
                    completed /
                    total *
                    100
                );


        goalsValueElement.innerHTML =
            `${completed}<span class="goal-total"> / ${total}</span>`;


        goalsProgressBar.style.width =
            `${percentage}%`;


        goalsDetailElement.textContent =
            `達成率 ${percentage}%`;


    } catch (error) {

        console.error(
            "目標データ取得失敗:",
            error
        );

    }

}



/* =========================
   LIFE SCORE
========================= */

async function loadLifeScore(user) {

    try {

        const scoreRef =
            doc(
                db,
                "users",
                user.uid,
                "lifeScore",
                "current"
            );


        const snapshot =
            await getDoc(
                scoreRef
            );


        if (
            !snapshot.exists()
        ) {

            console.log(
                "LIFE SCOREデータなし"
            );

            return;

        }


        const data =
            snapshot.data();


        const score =
            Number(
                data.score || 0
            );


        scoreElement.textContent =
            score;


        if (score >= 80) {

            scoreMessageElement.textContent =
                "GOOD CONDITION";

        } else if (
            score >= 60
        ) {

            scoreMessageElement.textContent =
                "STABLE";

        } else if (
            score >= 40
        ) {

            scoreMessageElement.textContent =
                "NEEDS ATTENTION";

        } else {

            scoreMessageElement.textContent =
                "TAKE CARE";

        }


    } catch (error) {

        console.error(
            "LIFE SCORE取得失敗:",
            error
        );

    }

}



/* =========================
   AUTH
========================= */

displayToday();


startAnonymousAuth(
    async (user) => {


        console.log(
            "LIFE DASHBOARD 起動"
        );


        console.log(
            "User UID:",
            user.uid
        );



        /* =========================
           UID
        ========================= */

        uidElement.textContent =
            user.uid;



        /* =========================
           ONLINE
        ========================= */

        statusElement.textContent =
            "ONLINE";



        /* =========================
           USER DATA
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



        /* =========================
           DASHBOARD DATA
        ========================= */

        await Promise.all([

            loadTodaySchedule(user),

            loadAWSProgress(user),

            loadGoals(user),

            loadLifeScore(user)

        ]);


        console.log(
            "ダッシュボードデータ取得完了"
        );

    }
);
