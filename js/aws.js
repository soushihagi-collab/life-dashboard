/* =========================================================
   LIFE DASHBOARD
   aws.js
========================================================= */


import {
    doc,
    getDoc,
    setDoc
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

const progressValueElement =
    document.getElementById("progress-value");

const progressBarElement =
    document.getElementById("progress-bar");

const progressDetailElement =
    document.getElementById("progress-detail");

const accuracyValueElement =
    document.getElementById("accuracy-value");

const accuracyDetailElement =
    document.getElementById("accuracy-detail");

const questionCountElement =
    document.getElementById("question-count");

const correctCountElement =
    document.getElementById("correct-count");

const incorrectCountElement =
    document.getElementById("incorrect-count");

const targetDateInput =
    document.getElementById("target-date");

const studyNoteInput =
    document.getElementById("study-note");

const saveButton =
    document.getElementById("save-button");

const saveMessageElement =
    document.getElementById("save-message");



/* =========================================================
   State
========================================================= */

let currentUser = null;



/* =========================================================
   Utility
========================================================= */


/*
 * 数値を0〜100に制限
 */
function clampPercentage(value) {

    const number =
        Number(value);

    if (Number.isNaN(number)) {
        return 0;
    }

    return Math.min(
        100,
        Math.max(0, number)
    );

}



/*
 * FirestoreのAWSドキュメント
 *
 * users/{uid}/aws/progress
 */
function getAwsDocumentRef(user) {

    return doc(
        db,
        "users",
        user.uid,
        "aws",
        "progress"
    );

}



/* =========================================================
   AWS DATA
========================================================= */

async function loadAwsData(user) {

    try {

        const awsRef =
            getAwsDocumentRef(user);

        const snapshot =
            await getDoc(awsRef);


        /*
         * データがまだない場合
         */

        if (!snapshot.exists()) {

            displayAwsData({
                progress: 0,
                accuracy: 0,
                questionCount: 0,
                correctCount: 0,
                incorrectCount: 0,
                targetDate: "",
                note: ""
            });

            return;

        }


        const data =
            snapshot.data();


        displayAwsData({

            progress:
                typeof data.progress === "number"
                    ? data.progress
                    : 0,

            accuracy:
                typeof data.accuracy === "number"
                    ? data.accuracy
                    : 0,

            questionCount:
                typeof data.questionCount === "number"
                    ? data.questionCount
                    : 0,

            correctCount:
                typeof data.correctCount === "number"
                    ? data.correctCount
                    : 0,

            incorrectCount:
                typeof data.incorrectCount === "number"
                    ? data.incorrectCount
                    : 0,

            targetDate:
                data.targetDate || "",

            note:
                data.note || ""

        });


    } catch (error) {

        console.error(
            "AWS SAAデータの取得に失敗しました",
            error
        );


        progressValueElement.textContent =
            "—";

        accuracyValueElement.textContent =
            "—";

        progressDetailElement.textContent =
            "データ取得エラー";

        accuracyDetailElement.textContent =
            "データ取得エラー";

    }

}



/* =========================================================
   DISPLAY
========================================================= */

function displayAwsData(data) {

    const progress =
        clampPercentage(data.progress);

    const accuracy =
        clampPercentage(data.accuracy);


    /*
     * 進捗
     */

    progressValueElement.textContent =
        `${progress}%`;

    progressBarElement.style.width =
        `${progress}%`;

    progressDetailElement.textContent =
        progress === 0
            ? "まだ学習記録がありません"
            : "AWS SAA 学習進捗";


    /*
     * 正答率
     */

    accuracyValueElement.textContent =
        `${accuracy}%`;

    accuracyDetailElement.textContent =
        data.questionCount === 0
            ? "まだ問題を解いていません"
            : `${data.questionCount}問を解答`;


    /*
     * 問題数
     */

    questionCountElement.textContent =
        data.questionCount;


    /*
     * 正解数
     */

    correctCountElement.textContent =
        data.correctCount;


    /*
     * 不正解数
     */

    incorrectCountElement.textContent =
        data.incorrectCount;


    /*
     * 設定
     */

    targetDateInput.value =
        data.targetDate;

    studyNoteInput.value =
        data.note;

}



/* =========================================================
   SAVE
========================================================= */

async function saveAwsData() {

    if (!currentUser) {

        return;

    }


    saveButton.disabled =
        true;

    saveMessageElement.textContent =
        "保存しています...";


    try {

        /*
         * 現在のデータを取得
         */

        const awsRef =
            getAwsDocumentRef(currentUser);

        const snapshot =
            await getDoc(awsRef);


        let existingData = {};


        if (snapshot.exists()) {

            existingData =
                snapshot.data();

        }


        /*
         * 保存
         *
         * 問題数など既存データは維持
         */

        await setDoc(
            awsRef,
            {

                progress:
                    typeof existingData.progress === "number"
                        ? existingData.progress
                        : 0,

                accuracy:
                    typeof existingData.accuracy === "number"
                        ? existingData.accuracy
                        : 0,

                questionCount:
                    typeof existingData.questionCount === "number"
                        ? existingData.questionCount
                        : 0,

                correctCount:
                    typeof existingData.correctCount === "number"
                        ? existingData.correctCount
                        : 0,

                incorrectCount:
                    typeof existingData.incorrectCount === "number"
                        ? existingData.incorrectCount
                        : 0,

                targetDate:
                    targetDateInput.value,

                note:
                    studyNoteInput.value.trim()

            }
        );


        saveMessageElement.textContent =
            "保存しました。";


        /*
         * 少し待ってメッセージを消す
         */

        setTimeout(() => {

            saveMessageElement.textContent =
                "";

        }, 2000);


    } catch (error) {

        console.error(
            "AWS SAAデータの保存に失敗しました",
            error
        );

        saveMessageElement.textContent =
            "保存に失敗しました。";

    } finally {

        saveButton.disabled =
            false;

    }

}



/* =========================================================
   EVENT
========================================================= */

saveButton.addEventListener(
    "click",
    saveAwsData
);



/* =========================================================
   AUTH
========================================================= */

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            authStatusElement.textContent =
                "Authentication required";

            return;

        }


        currentUser =
            user;


        console.log(
            "Firebase認証成功"
        );

        console.log(
            "UID:",
            user.uid
        );


        authStatusElement.textContent =
            "Connected";


        await loadAwsData(user);

    }
);
