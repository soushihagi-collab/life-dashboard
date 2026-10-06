/* =========================================================
   LIFE DASHBOARD
   dashboard.js
========================================================= */


import {
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";


import {
    auth,
    db
} from "./firebase.js";



/* =========================================================
   DOM
========================================================= */


const authStatusElement =
    document.getElementById("auth-status");


const userUidElement =
    document.getElementById("user-uid");


const todayDateElement =
    document.getElementById("today-date");


const todayValueElement =
    document.getElementById("today-value");


const todayDetailElement =
    document.getElementById("today-detail");


const awsValueElement =
    document.getElementById("aws-value");


const awsDetailElement =
    document.getElementById("aws-detail");


const awsProgressBarElement =
    document.getElementById("aws-progress-bar");


const goalsValueElement =
    document.getElementById("goals-value");


const goalsDetailElement =
    document.getElementById("goals-detail");


const goalsProgressBarElement =
    document.getElementById("goals-progress-bar");


const lifeScoreValueElement =
    document.getElementById("life-score-value");


const lifeScoreDetailElement =
    document.getElementById("life-score-detail");



/* =========================================================
   Utility
========================================================= */


/*
 * 現在のローカル日付を
 * YYYY-MM-DD に変換
 */
function getLocalDateKey(date = new Date()) {

    const year =
        date.getFullYear();


    const month =
        String(date.getMonth() + 1)
            .padStart(2, "0");


    const day =
        String(date.getDate())
            .padStart(2, "0");


    return `${year}-${month}-${day}`;

}



/*
 * 今日の日付表示
 */
function updateTodayDate() {

    if (!todayDateElement) {

        return;

    }


    const now =
        new Date();


    const year =
        now.getFullYear();


    const month =
        now.getMonth() + 1;


    const day =
        now.getDate();


    const weekday =
        [
            "日",
            "月",
            "火",
            "水",
            "木",
            "金",
            "土"
        ][now.getDay()];


    todayDateElement.textContent =
        `${year}/${month}/${day} (${weekday})`;

}



/*
 * 現在時刻を HH:MM にする
 */
function getCurrentTimeKey() {

    const now =
        new Date();


    const hours =
        String(now.getHours())
            .padStart(2, "0");


    const minutes =
        String(now.getMinutes())
            .padStart(2, "0");


    return `${hours}:${minutes}`;

}



/*
 * 「あと○分」
 */
function getMinutesUntil(time) {

    const now =
        new Date();


    const [hour, minute] =
        time
            .split(":")
            .map(Number);


    const target =
        new Date(now);


    target.setHours(
        hour,
        minute,
        0,
        0
    );


    const difference =
        Math.floor(
            (target - now) / 60000
        );


    return difference;

}



/*
 * 0～100の範囲に収める
 */
function normalizePercentage(value) {

    if (typeof value !== "number") {

        return 0;

    }


    return Math.min(
        100,
        Math.max(
            0,
            value
        )
    );

}



/* =========================================================
   TODAY
========================================================= */


async function loadTodaySchedule(user) {

    if (
        !todayValueElement ||
        !todayDetailElement
    ) {

        return;

    }


    try {

        const today =
            getLocalDateKey();


        const schedulesRef =
            collection(
                db,
                "users",
                user.uid,
                "schedules"
            );


        const snapshot =
            await getDocs(
                schedulesRef
            );


        const todaySchedules = [];


        snapshot.forEach(
            (docSnapshot) => {

                const data =
                    docSnapshot.data();


                if (
                    data.date !== today
                ) {

                    return;

                }


                todaySchedules.push({

                    id:
                        docSnapshot.id,

                    date:
                        data.date,

                    time:
                        data.time || "",

                    title:
                        data.title || "",

                    completed:
                        data.completed === true

                });

            }
        );



        /* =================================================
           今日の予定数
        ================================================== */

        todayValueElement.textContent =
            `${todaySchedules.length}件`;



        /* =================================================
           時刻順に並べる
        ================================================== */

        todaySchedules.sort(
            (a, b) => {

                return a.time.localeCompare(
                    b.time
                );

            }
        );



        /* =================================================
           今日の予定がない
        ================================================== */

        if (
            todaySchedules.length === 0
        ) {

            todayDetailElement.textContent =
                "今日の予定はありません";

            return;

        }



        /* =================================================
           現在時刻
        ================================================== */

        const currentTime =
            getCurrentTimeKey();



        /* =================================================
           次の予定を探す
           
           条件：
           ・未完了
           ・現在時刻以降
        ================================================== */

        const nextSchedules =
            todaySchedules.filter(
                (schedule) => {

                    return (
                        schedule.completed !== true &&
                        schedule.time >= currentTime
                    );

                }
            );



        /* =================================================
           次の予定がない
        ================================================== */

        if (
            nextSchedules.length === 0
        ) {

            const incompleteSchedules =
                todaySchedules.filter(
                    (schedule) =>
                        schedule.completed !== true
                );


            if (
                incompleteSchedules.length > 0
            ) {

                todayDetailElement.textContent =
                    "今日の予定はすべて終了";

            } else {

                todayDetailElement.textContent =
                    "今日の予定はすべて完了";

            }


            return;

        }



        /* =================================================
           一番近い予定
        ================================================== */

        const nextSchedule =
            nextSchedules[0];



        let detailText =
            `${nextSchedule.time}　${nextSchedule.title}`;



        /* =================================================
           あと○分
        ================================================== */

        const minutesUntil =
            getMinutesUntil(
                nextSchedule.time
            );


        if (
            minutesUntil >= 0
        ) {

            detailText +=
                `　（あと${minutesUntil}分）`;

        }



        todayDetailElement.textContent =
            detailText;



    } catch (error) {

        console.error(
            "TODAYの予定取得に失敗しました",
            error
        );


        todayValueElement.textContent =
            "取得失敗";


        todayDetailElement.textContent =
            "予定を取得できませんでした";

    }

}



/* =========================================================
   AWS SAA
========================================================= */


async function loadAwsProgress(user) {

    if (
        !awsValueElement &&
        !awsDetailElement
    ) {

        return;

    }


    try {

        const awsRef =
            collection(
                db,
                "users",
                user.uid,
                "aws"
            );


        const snapshot =
            await getDocs(
                awsRef
            );



        /* =================================================
           データがない
        ================================================== */

        if (
            snapshot.empty
        ) {

            if (awsValueElement) {

                awsValueElement.textContent =
                    "0%";

            }


            if (awsDetailElement) {

                awsDetailElement.textContent =
                    "学習データなし";

            }


            if (awsProgressBarElement) {

                awsProgressBarElement.style.width =
                    "0%";

            }


            return;

        }



        /* =================================================
           AWSデータ
        ================================================== */

        let progress =
            null;


        let accuracy =
            null;



        snapshot.forEach(
            (docSnapshot) => {

                const data =
                    docSnapshot.data();


                if (
                    typeof data.progress === "number"
                ) {

                    progress =
                        data.progress;

                }


                if (
                    typeof data.accuracy === "number"
                ) {

                    accuracy =
                        data.accuracy;

                }

            }
        );



        /* =================================================
           Progress
        ================================================== */

        if (
            progress !== null
        ) {

            progress =
                normalizePercentage(
                    progress
                );

        }



        /* =================================================
           AWSメイン表示
        ================================================== */

        if (awsValueElement) {

            if (
                progress !== null
            ) {

                awsValueElement.textContent =
                    `${progress}%`;

            } else {

                awsValueElement.textContent =
                    "学習中";

            }

        }



        /* =================================================
           AWSプログレスバー
        ================================================== */

        if (
            awsProgressBarElement
        ) {

            const progressValue =
                progress !== null
                    ? progress
                    : 0;


            awsProgressBarElement.style.width =
                `${progressValue}%`;

        }



        /* =================================================
           AWS詳細
        ================================================== */

        if (
            awsDetailElement
        ) {

            if (
                accuracy !== null
            ) {

                accuracy =
                    normalizePercentage(
                        accuracy
                    );


                awsDetailElement.textContent =
                    `正答率 ${accuracy}%`;

            } else {

                awsDetailElement.textContent =
                    "AWS SAA 学習";

            }

        }



    } catch (error) {

        console.error(
            "AWS SAA情報の取得に失敗しました",
            error
        );


        if (awsValueElement) {

            awsValueElement.textContent =
                "—";

        }


        if (awsDetailElement) {

            awsDetailElement.textContent =
                "データ取得エラー";

        }


        if (awsProgressBarElement) {

            awsProgressBarElement.style.width =
                "0%";

        }

    }

}



/* =========================================================
   GOALS
========================================================= */


async function loadGoals(user) {

    if (
        !goalsValueElement &&
        !goalsDetailElement
    ) {

        return;

    }


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


        const activeGoals = [];



        /* =================================================
           未完了の目標を取得
        ================================================== */

        snapshot.forEach(
            (docSnapshot) => {

                const data =
                    docSnapshot.data();


                if (
                    data.completed === true
                ) {

                    return;

                }


                activeGoals.push({

                    id:
                        docSnapshot.id,

                    title:
                        data.title || "",

                    progress:
                        typeof data.progress === "number"
                            ? normalizePercentage(
                                data.progress
                            )
                            : 0,

                    deadline:
                        data.deadline || ""

                });

            }
        );



        /* =================================================
           目標なし
        ================================================== */

        if (
            activeGoals.length === 0
        ) {

            if (goalsValueElement) {

                goalsValueElement.textContent =
                    "0";

            }


            if (goalsDetailElement) {

                goalsDetailElement.textContent =
                    "目標を設定しましょう";

            }


            if (goalsProgressBarElement) {

                goalsProgressBarElement.style.width =
                    "0%";

            }


            return;

        }



        /* =================================================
           目標数
        ================================================== */

        if (
            goalsValueElement
        ) {

            goalsValueElement.textContent =
                `${activeGoals.length}`;

        }



        /* =================================================
           平均進捗
        ================================================== */

        const totalProgress =
            activeGoals.reduce(
                (sum, goal) => {

                    return (
                        sum +
                        goal.progress
                    );

                },
                0
            );


        const averageProgress =
            Math.round(
                totalProgress /
                activeGoals.length
            );



        /* =================================================
           Goals詳細
        ================================================== */

        if (
            goalsDetailElement
        ) {

            goalsDetailElement.textContent =
                `平均進捗 ${averageProgress}%`;

        }



        /* =================================================
           Goalsプログレスバー
        ================================================== */

        if (
            goalsProgressBarElement
        ) {

            goalsProgressBarElement.style.width =
                `${averageProgress}%`;

        }



    } catch (error) {

        console.error(
            "Goals情報の取得に失敗しました",
            error
        );


        if (
            goalsValueElement
        ) {

            goalsValueElement.textContent =
                "—";

        }


        if (
            goalsDetailElement
        ) {

            goalsDetailElement.textContent =
                "データ取得エラー";

        }


        if (
            goalsProgressBarElement
        ) {

            goalsProgressBarElement.style.width =
                "0%";

        }

    }

}



/* =========================================================
   LIFE SCORE
========================================================= */


async function loadLifeScore(user) {

    if (
        !lifeScoreValueElement &&
        !lifeScoreDetailElement
    ) {

        return;

    }


    try {

        const lifeScoreRef =
            collection(
                db,
                "users",
                user.uid,
                "lifeScore"
            );


        const snapshot =
            await getDocs(
                lifeScoreRef
            );



        /* =================================================
           データなし
        ================================================== */

        if (
            snapshot.empty
        ) {

            if (
                lifeScoreValueElement
            ) {

                lifeScoreValueElement.textContent =
                    "—";

            }


            if (
                lifeScoreDetailElement
            ) {

                lifeScoreDetailElement.textContent =
                    "まだ記録がありません";

            }


            return;

        }



        /* =================================================
           current を優先
        ================================================== */

        let currentScore =
            null;


        snapshot.forEach(
            (docSnapshot) => {

                const data =
                    docSnapshot.data();


                if (
                    docSnapshot.id === "current"
                ) {

                    if (
                        typeof data.score === "number"
                    ) {

                        currentScore =
                            data.score;

                    }

                }

            }
        );



        /* =================================================
           current がなければ
           scoreを持つデータを使用
        ================================================== */

        if (
            currentScore === null
        ) {

            snapshot.forEach(
                (docSnapshot) => {

                    const data =
                        docSnapshot.data();


                    if (
                        currentScore === null &&
                        typeof data.score === "number"
                    ) {

                        currentScore =
                            data.score;

                    }

                }
            );

        }



        /* =================================================
           スコアを0～100に補正
        ================================================== */

        if (
            currentScore !== null
        ) {

            currentScore =
                normalizePercentage(
                    currentScore
                );

        }



        /* =================================================
           LIFE SCORE表示
        ================================================== */

        if (
            lifeScoreValueElement
        ) {

            if (
                currentScore !== null
            ) {

                lifeScoreValueElement.textContent =
                    `${currentScore}`;

            } else {

                lifeScoreValueElement.textContent =
                    "—";

            }

        }



        /* =================================================
           詳細
        ================================================== */

        if (
            lifeScoreDetailElement
        ) {

            if (
                currentScore !== null
            ) {

                lifeScoreDetailElement.textContent =
                    "現在のLIFE SCORE";

            } else {

                lifeScoreDetailElement.textContent =
                    "スコアデータなし";

            }

        }



    } catch (error) {

        console.error(
            "LIFE SCOREの取得に失敗しました",
            error
        );


        if (
            lifeScoreValueElement
        ) {

            lifeScoreValueElement.textContent =
                "—";

        }


        if (
            lifeScoreDetailElement
        ) {

            lifeScoreDetailElement.textContent =
                "データ取得エラー";

        }

    }

}



/* =========================================================
   USER INFO
========================================================= */


function updateUserInfo(user) {

    if (
        userUidElement
    ) {

        userUidElement.textContent =
            user.uid;

    }

}



/* =========================================================
   Dashboard 全体読み込み
========================================================= */


async function loadDashboard(user) {

    updateTodayDate();

    updateUserInfo(user);


    await Promise.all([

        loadTodaySchedule(user),

        loadAwsProgress(user),

        loadGoals(user),

        loadLifeScore(user)

    ]);

}



/* =========================================================
   Firebase Authentication
========================================================= */


onAuthStateChanged(

    auth,

    async (user) => {


        /* =================================================
           未認証
        ================================================== */

        if (!user) {

            if (
                authStatusElement
            ) {

                authStatusElement.textContent =
                    "Authentication required";

            }


            if (
                userUidElement
            ) {

                userUidElement.textContent =
                    "NOT CONNECTED";

            }


            return;

        }



        /* =================================================
           認証成功
        ================================================== */

        console.log(
            "Firebase認証成功"
        );


        console.log(
            "UID:",
            user.uid
        );



        if (
            authStatusElement
        ) {

            authStatusElement.textContent =
                "Connected";

        }



        await loadDashboard(
            user
        );

    }

);



/* =========================================================
   時刻更新
========================================================= */


/*
 * 1分ごとにTODAYを更新
 *
 * 例：
 *
 * 19:00 AWS SAA
 * ↓
 * 時刻経過
 * ↓
 * 20:00 英語
 *
 * のように次の予定へ切り替わる。
 */


setInterval(

    () => {

        updateTodayDate();


        if (
            auth.currentUser
        ) {

            loadTodaySchedule(
                auth.currentUser
            );

        }

    },

    60 * 1000

);



/* =========================================================
   初期日付表示
========================================================= */


updateTodayDate();
