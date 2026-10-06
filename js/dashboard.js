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
   DOM ELEMENTS
========================= */

const uidElement =
    document.getElementById("user-uid");

const statusElement =
    document.getElementById("auth-status");

const dateElement =
    document.getElementById("today-date");


/* TODAY */

const todayValueElement =
    document.querySelector(
        ".dashboard-card:nth-child(1) .card-main-value"
    );

const todayDetailElement =
    document.querySelector(
        ".dashboard-card:nth-child(1) .card-detail"
    );


/* AWS */

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


/* GOALS */

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


/* LIFE SCORE */

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
   TODAY KEY
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
   TODAY SCHEDULE
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
                    id:
                        item.id,

                    ...item.data()
                })
            );


        /*
         * 今日の予定数
         */

        todayValueElement.textContent =
            schedules.length;


        /*
         * 予定がない場合
         */

        if (
            schedules.length === 0
        ) {

            todayDetailElement.textContent =
                "今日の予定はありません";

            return;
        }


        /*
         * 現在時刻を取得
         */

        const now =
            new Date();


        const currentHour =
            String(
                now.getHours()
            ).padStart(
                2,
                "0"
            );


        const currentMinute =
            String(
                now.getMinutes()
            ).padStart(
                2,
                "0"
            );


        const currentTime =
            `${currentHour}:${currentMinute}`;


        /*
         * 現在時刻以降の予定だけ取得
         */

        const upcomingSchedules =
            schedules
                .filter(
                    (schedule) =>
                        schedule.time &&
                        schedule.time >= currentTime
                )
                .sort(
                    (a, b) =>
                        String(
                            a.time
                        ).localeCompare(
                            String(
                                b.time
                            )
                        )
                );


        /*
         * 次の予定がある場合
         */

        if (
            upcomingSchedules.length > 0
        ) {

            const nextSchedule =
                upcomingSchedules[0];


            todayDetailElement.textContent =
                `次の予定：${nextSchedule.time}`;


            return;
        }


        /*
         * 今日の予定がすべて終了
         */

        todayDetailElement.textContent =
            "今日の予定はすべて終了";


    } catch (error) {

        console.error(
            "予定取得失敗:",
            error
        );


        todayValueElement.textContent =
            "—";


        todayDetailElement.textContent =
            "予定を取得できませんでした";
    }
}


/* =========================
   AWS PROGRESS
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
                Math.max(
                    progress,
                    0
                ),
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
                (item) =>
                    item.data()
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


        if (
            score >= 80
        ) {

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
   INITIALIZE
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


        /*
         * UID表示
         */

        uidElement.textContent =
            user.uid;


        /*
         * ONLINE表示
         */

        statusElement.textContent =
            "ONLINE";


        /*
         * Firestoreユーザー情報
         */

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


        /*
         * Dashboardデータ取得
         */

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
