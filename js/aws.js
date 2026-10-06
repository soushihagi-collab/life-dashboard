/* =========================================================
   LIFE DASHBOARD
   AWS SAA
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
    document.getElementById(
        "auth-status"
    );


const progressValueElement =
    document.getElementById(
        "aws-progress-value"
    );


const progressBarElement =
    document.getElementById(
        "aws-progress-bar"
    );


const progressTextElement =
    document.getElementById(
        "aws-progress-text"
    );


const accuracyValueElement =
    document.getElementById(
        "aws-accuracy-value"
    );


const questionCountElement =
    document.getElementById(
        "aws-question-count"
    );


const correctCountElement =
    document.getElementById(
        "aws-correct-count"
    );


const incorrectCountElement =
    document.getElementById(
        "aws-incorrect-count"
    );


const targetDateDisplayElement =
    document.getElementById(
        "aws-target-date-display"
    );


const targetDateInputElement =
    document.getElementById(
        "aws-target-date"
    );


const progressInputElement =
    document.getElementById(
        "aws-progress-input"
    );


const noteElement =
    document.getElementById(
        "aws-note"
    );


const saveButtonElement =
    document.getElementById(
        "aws-save-button"
    );


const saveStatusElement =
    document.getElementById(
        "aws-save-status"
    );


const questionNumberElement =
    document.getElementById(
        "question-number"
    );


const questionTextElement =
    document.getElementById(
        "question-text"
    );


const answerListElement =
    document.getElementById(
        "answer-list"
    );


const questionResultElement =
    document.getElementById(
        "question-result"
    );


const nextQuestionButtonElement =
    document.getElementById(
        "next-question-button"
    );



/* =========================================================
   AWS DATA
========================================================= */


/*
 * 現在のAWS学習データ
 */
let awsData = {

    progress: 0,

    accuracy: 0,

    questionCount: 0,

    correctCount: 0,

    incorrectCount: 0,

    targetDate: "",

    note: ""

};



/*
 * 現在のユーザー
 */
let currentUser = null;



/* =========================================================
   QUESTION DATABASE
========================================================= */


/*
 * AWS SAA 学習用問題
 *
 * 今後ここへ問題を追加していく。
 */

const questionDatabase = [

    {

        question:
            "あるEC2インスタンスから、インターネット経由ではなくAWS上のS3バケットへアクセスしたい。最も適切な方法はどれか。",

        choices: [

            "Internet Gatewayを使用する",

            "S3 Gateway Endpointを使用する",

            "NAT Gatewayを使用する",

            "Virtual Private Gatewayを使用する"

        ],

        answer: 1,

        explanation:
            "S3 Gateway Endpointを利用すると、VPC内のリソースからS3へAWSネットワークを経由してアクセスできます。NAT GatewayやInternet Gatewayを経由する必要がありません。"

    },


    {

        question:
            "複数のEC2インスタンスへログインする際、SSHキーを各サーバーへ配布せずに安全にアクセスしたい。最も適切なサービスはどれか。",

        choices: [

            "AWS Systems Manager Session Manager",

            "Amazon CloudFront",

            "Amazon Route 53",

            "AWS Direct Connect"

        ],

        answer: 0,

        explanation:
            "Systems Manager Session Managerを使用すると、SSHポートを開放したりSSHキーを配布したりせずにEC2へ接続できます。"

    },


    {

        question:
            "Webアプリケーションを複数のAvailability Zoneに配置したEC2へ負荷分散したい。最も適切なサービスはどれか。",

        choices: [

            "Amazon S3",

            "Application Load Balancer",

            "AWS Lambda",

            "Amazon Route 53 Resolver"

        ],

        answer: 1,

        explanation:
            "Application Load BalancerはHTTP/HTTPSのトラフィックを複数のターゲットへ分散できます。複数AZにEC2を配置することで可用性も高められます。"

    },


    {

        question:
            "ある企業が、AWSアカウント内のユーザーに対して必要最小限の権限だけを与えたい。これはどの考え方に該当するか。",

        choices: [

            "Defense in Depth",

            "Least Privilege",

            "Fault Tolerance",

            "Elasticity"

        ],

        answer: 1,

        explanation:
            "Least Privilege（最小権限の原則）は、ユーザーやサービスに必要最低限の権限だけを付与する考え方です。"

    },


    {

        question:
            "大量の静的コンテンツを世界中のユーザーへ低レイテンシーで配信したい。最も適切なサービスはどれか。",

        choices: [

            "Amazon CloudFront",

            "Amazon RDS",

            "AWS Secrets Manager",

            "Amazon SQS"

        ],

        answer: 0,

        explanation:
            "CloudFrontはAWSのCDNサービスであり、エッジロケーションを利用して世界中のユーザーへコンテンツを低レイテンシーで配信できます。"

    }

];



/* =========================================================
   QUESTION STATE
========================================================= */


let currentQuestionIndex =
    0;


let questionAnswered =
    false;



/* =========================================================
   UTILITY
========================================================= */


/*
 * 数値を0～100にする
 */
function normalizePercentage(value) {

    const number =
        Number(value);


    if (
        Number.isNaN(number)
    ) {

        return 0;

    }


    return Math.min(
        100,
        Math.max(
            0,
            number
        )
    );

}



/*
 * 正答率を計算
 */
function calculateAccuracy(
    correctCount,
    questionCount
) {

    if (
        questionCount <= 0
    ) {

        return 0;

    }


    return Math.round(
        (
            correctCount /
            questionCount
        ) * 100
    );

}



/* =========================================================
   DISPLAY
========================================================= */


/*
 * AWSデータを画面へ反映
 */
function renderAwsData() {

    const progress =
        normalizePercentage(
            awsData.progress
        );


    const accuracy =
        normalizePercentage(
            awsData.accuracy
        );



    /* =====================================================
       Progress
    ====================================================== */

    if (
        progressValueElement
    ) {

        progressValueElement.textContent =
            `${progress}%`;

    }


    if (
        progressBarElement
    ) {

        progressBarElement.style.width =
            `${progress}%`;

    }


    if (
        progressTextElement
    ) {

        progressTextElement.textContent =
            `${progress}%`;

    }



    /* =====================================================
       Accuracy
    ====================================================== */

    if (
        accuracyValueElement
    ) {

        accuracyValueElement.textContent =
            `${accuracy}%`;

    }



    /* =====================================================
       Questions
    ====================================================== */

    if (
        questionCountElement
    ) {

        questionCountElement.textContent =
            awsData.questionCount;

    }


    if (
        correctCountElement
    ) {

        correctCountElement.textContent =
            awsData.correctCount;

    }


    if (
        incorrectCountElement
    ) {

        incorrectCountElement.textContent =
            awsData.incorrectCount;

    }



    /* =====================================================
       Target Date
    ====================================================== */

    if (
        targetDateInputElement
    ) {

        targetDateInputElement.value =
            awsData.targetDate || "";

    }


    if (
        targetDateDisplayElement
    ) {

        if (
            awsData.targetDate
        ) {

            targetDateDisplayElement.textContent =
                awsData.targetDate;

        } else {

            targetDateDisplayElement.textContent =
                "—";

        }

    }



    /* =====================================================
       Note
    ====================================================== */

    if (
        noteElement
    ) {

        noteElement.value =
            awsData.note || "";

    }



    if (
        progressInputElement
    ) {

        progressInputElement.value =
            progress;

    }

}



/* =========================================================
   FIRESTORE
========================================================= */


/*
 * AWS progress document
 *
 * users
 *  └─ UID
 *      └─ aws
 *          └─ progress
 */
function getAwsProgressRef(user) {

    return doc(

        db,

        "users",

        user.uid,

        "aws",

        "progress"

    );

}



/*
 * AWSデータ読み込み
 */
async function loadAwsData(user) {

    try {

        const awsRef =
            getAwsProgressRef(
                user
            );


        const snapshot =
            await getDoc(
                awsRef
            );



        if (
            snapshot.exists()
        ) {

            const data =
                snapshot.data();


            awsData = {

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

            };

        } else {

            awsData = {

                progress: 0,

                accuracy: 0,

                questionCount: 0,

                correctCount: 0,

                incorrectCount: 0,

                targetDate: "",

                note: ""

            };

        }



        renderAwsData();



    } catch (error) {

        console.error(
            "AWSデータ読み込みエラー:",
            error
        );

    }

}



/*
 * AWSデータ保存
 */
async function saveAwsData() {

    if (
        !currentUser
    ) {

        return;

    }



    try {

        if (
            saveButtonElement
        ) {

            saveButtonElement.disabled =
                true;

        }


        if (
            saveStatusElement
        ) {

            saveStatusElement.textContent =
                "保存しています...";

        }



        const progress =
            normalizePercentage(
                progressInputElement
                    ? progressInputElement.value
                    : awsData.progress
            );


        const targetDate =
            targetDateInputElement
                ? targetDateInputElement.value
                : "";


        const note =
            noteElement
                ? noteElement.value.trim()
                : "";



        awsData.progress =
            progress;


        awsData.targetDate =
            targetDate;


        awsData.note =
            note;



        const awsRef =
            getAwsProgressRef(
                currentUser
            );


        await setDoc(

            awsRef,

            {

                progress:
                    awsData.progress,

                accuracy:
                    awsData.accuracy,

                questionCount:
                    awsData.questionCount,

                correctCount:
                    awsData.correctCount,

                incorrectCount:
                    awsData.incorrectCount,

                targetDate:
                    awsData.targetDate,

                note:
                    awsData.note

            }

        );



        renderAwsData();



        if (
            saveStatusElement
        ) {

            saveStatusElement.textContent =
                "保存しました";

        }



    } catch (error) {

        console.error(
            "AWSデータ保存エラー:",
            error
        );


        if (
            saveStatusElement
        ) {

            saveStatusElement.textContent =
                "保存に失敗しました";

        }



    } finally {

        if (
            saveButtonElement
        ) {

            saveButtonElement.disabled =
                false;

        }

    }

}



/* =========================================================
   QUESTION
========================================================= */


/*
 * 現在の問題を表示
 */
function renderQuestion() {

    const question =
        questionDatabase[
            currentQuestionIndex
        ];


    if (
        !question
    ) {

        currentQuestionIndex =
            0;

        renderQuestion();

        return;

    }


    questionAnswered =
        false;



    if (
        questionNumberElement
    ) {

        questionNumberElement.textContent =
            `QUESTION ${currentQuestionIndex + 1}`;

    }


    if (
        questionTextElement
    ) {

        questionTextElement.textContent =
            question.question;

    }


    if (
        answerListElement
    ) {

        answerListElement.innerHTML =
            "";

    }


    if (
        questionResultElement
    ) {

        questionResultElement.style.display =
            "none";

        questionResultElement.textContent =
            "";

    }


    if (
        nextQuestionButtonElement
    ) {

        nextQuestionButtonElement.style.display =
            "none";

    }



    question.choices.forEach(
        (choice, index) => {


            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "answer-button";


            button.textContent =
                `${index + 1}. ${choice}`;


            button.addEventListener(
                "click",
                () => {

                    answerQuestion(
                        index
                    );

                }
            );


            if (
                answerListElement
            ) {

                answerListElement.appendChild(
                    button
                );

            }

        }
    );

}



/*
 * 問題に回答
 */
async function answerQuestion(
    selectedIndex
) {

    if (
        questionAnswered
    ) {

        return;

    }


    questionAnswered =
        true;


    const question =
        questionDatabase[
            currentQuestionIndex
        ];


    const answerButtons =
        answerListElement
            ? answerListElement.querySelectorAll(
                ".answer-button"
            )
            : [];



    /* =====================================================
       ボタンを停止
    ====================================================== */

    answerButtons.forEach(
        (button) => {

            button.disabled =
                true;

        }
    );



    /* =====================================================
       正誤判定
    ====================================================== */

    const isCorrect =
        selectedIndex ===
        question.answer;



    /* =====================================================
       正解表示
    ====================================================== */

    answerButtons.forEach(
        (button, index) => {

            if (
                index === question.answer
            ) {

                button.classList.add(
                    "correct"
                );

            }


            if (
                index === selectedIndex &&
                !isCorrect
            ) {

                button.classList.add(
                    "incorrect"
                );

            }

        }
    );



    /* =====================================================
       統計更新
    ====================================================== */

    awsData.questionCount +=
        1;


    if (
        isCorrect
    ) {

        awsData.correctCount +=
            1;

    } else {

        awsData.incorrectCount +=
            1;

    }


    awsData.accuracy =
        calculateAccuracy(

            awsData.correctCount,

            awsData.questionCount

        );



    /* =====================================================
       Firestore保存
    ====================================================== */

    await saveQuestionResult();



    /* =====================================================
       結果表示
    ====================================================== */

    if (
        questionResultElement
    ) {

        questionResultElement.style.display =
            "block";


        if (
            isCorrect
        ) {

            questionResultElement.textContent =
                `正解です。\n\n解説：${question.explanation}`;

        } else {

            questionResultElement.textContent =
                `不正解です。\n\n正解：${question.choices[question.answer]}\n\n解説：${question.explanation}`;

        }

    }



    if (
        nextQuestionButtonElement
    ) {

        nextQuestionButtonElement.style.display =
            "block";

    }


}



/*
 * 問題結果をFirestoreへ保存
 */
async function saveQuestionResult() {

    if (
        !currentUser
    ) {

        return;

    }


    try {

        const awsRef =
            getAwsProgressRef(
                currentUser
            );


        await setDoc(

            awsRef,

            {

                progress:
                    awsData.progress,

                accuracy:
                    awsData.accuracy,

                questionCount:
                    awsData.questionCount,

                correctCount:
                    awsData.correctCount,

                incorrectCount:
                    awsData.incorrectCount,

                targetDate:
                    awsData.targetDate,

                note:
                    awsData.note

            }

        );


        renderAwsData();



    } catch (error) {

        console.error(
            "問題結果保存エラー:",
            error
        );

    }

}



/* =========================================================
   NEXT QUESTION
========================================================= */


function nextQuestion() {

    currentQuestionIndex +=
        1;


    if (
        currentQuestionIndex >=
        questionDatabase.length
    ) {

        currentQuestionIndex =
            0;

    }


    renderQuestion();

}



/* =========================================================
   EVENT
========================================================= */


if (
    saveButtonElement
) {

    saveButtonElement.addEventListener(

        "click",

        saveAwsData

    );

}



if (
    nextQuestionButtonElement
) {

    nextQuestionButtonElement.addEventListener(

        "click",

        nextQuestion

    );

}



/* =========================================================
   FIREBASE AUTH
========================================================= */


onAuthStateChanged(

    auth,

    async (user) => {


        if (
            !user
        ) {

            currentUser =
                null;


            if (
                authStatusElement
            ) {

                authStatusElement.textContent =
                    "Authentication required";

            }


            if (
                questionTextElement
            ) {

                questionTextElement.textContent =
                    "認証が必要です";

            }


            return;

        }



        /* =================================================
           USER
        ================================================== */

        currentUser =
            user;



        if (
            authStatusElement
        ) {

            authStatusElement.textContent =
                "Connected";

        }



        /* =================================================
           AWS DATA
        ================================================== */

        await loadAwsData(
            user
        );



        /* =================================================
           QUESTION
        ================================================== */

        renderQuestion();

    }

);
