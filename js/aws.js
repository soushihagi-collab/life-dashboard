/* =========================================================
   LIFE DASHBOARD
   AWS SAA
   aws.js

   AWS学習機能
   ・問題表示
   ・正誤判定
   ・解説表示
   ・問題数カウント
   ・正解数カウント
   ・不正解数カウント
   ・正答率計算
   ・学習進捗保存
   ・目標日保存
   ・学習メモ保存
   ・Firebase / Firestore 保存
========================================================= */


/* =========================================================
   FIREBASE
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
    document.getElementById("aws-progress-value");


const progressBarElement =
    document.getElementById("aws-progress-bar");


const progressTextElement =
    document.getElementById("aws-progress-text");


const accuracyValueElement =
    document.getElementById("aws-accuracy-value");


const questionCountElement =
    document.getElementById("aws-question-count");


const correctCountElement =
    document.getElementById("aws-correct-count");


const incorrectCountElement =
    document.getElementById("aws-incorrect-count");


const targetDateDisplayElement =
    document.getElementById("aws-target-date-display");


const targetDateInputElement =
    document.getElementById("aws-target-date");


const progressInputElement =
    document.getElementById("aws-progress-input");


const noteElement =
    document.getElementById("aws-note");


const saveButtonElement =
    document.getElementById("aws-save-button");


const saveStatusElement =
    document.getElementById("aws-save-status");


const questionNumberElement =
    document.getElementById("question-number");


const questionTextElement =
    document.getElementById("question-text");


const answerListElement =
    document.getElementById("answer-list");


const questionResultElement =
    document.getElementById("question-result");


const nextQuestionButtonElement =
    document.getElementById("next-question-button");



/* =========================================================
   AWS DATA
========================================================= */

let awsData = {

    progress: 0,

    accuracy: 0,

    questionCount: 0,

    correctCount: 0,

    incorrectCount: 0,

    targetDate: "",

    note: ""

};



/* =========================================================
   CURRENT USER
========================================================= */

let currentUser = null;



/* =========================================================
   QUESTION DATABASE
========================================================= */

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

let currentQuestionIndex = 0;

let questionAnswered = false;



/* =========================================================
   FIRESTORE REFERENCE
========================================================= */

function getAwsProgressRef(user) {

    return doc(
        db,
        "users",
        user.uid,
        "aws",
        "progress"
    );

}



/* =========================================================
   RENDER AWS DATA
========================================================= */

function renderAwsData() {


    /* =====================================================
       PROGRESS
    ====================================================== */

    const progress =
        Number(awsData.progress) || 0;


    if (progressValueElement) {

        progressValueElement.textContent =
            `${progress}%`;

    }


    if (progressBarElement) {

        progressBarElement.style.width =
            `${progress}%`;

    }


    if (progressTextElement) {

        progressTextElement.textContent =
            `${progress}%`;

    }



    /* =====================================================
       ACCURACY
    ====================================================== */

    const accuracy =
        Number(awsData.accuracy) || 0;


    if (accuracyValueElement) {

        accuracyValueElement.textContent =
            `${accuracy}%`;

    }



    /* =====================================================
       QUESTION COUNT
    ====================================================== */

    if (questionCountElement) {

        questionCountElement.textContent =
            Number(awsData.questionCount) || 0;

    }



    /* =====================================================
       CORRECT
    ====================================================== */

    if (correctCountElement) {

        correctCountElement.textContent =
            Number(awsData.correctCount) || 0;

    }



    /* =====================================================
       INCORRECT
    ====================================================== */

    if (incorrectCountElement) {

        incorrectCountElement.textContent =
            Number(awsData.incorrectCount) || 0;

    }



    /* =====================================================
       TARGET DATE
    ====================================================== */

    if (targetDateDisplayElement) {

        if (awsData.targetDate) {

            targetDateDisplayElement.textContent =
                awsData.targetDate;

        } else {

            targetDateDisplayElement.textContent =
                "—";

        }

    }


    if (targetDateInputElement) {

        targetDateInputElement.value =
            awsData.targetDate || "";

    }



    /* =====================================================
       PROGRESS INPUT
    ====================================================== */

    if (progressInputElement) {

        progressInputElement.value =
            progress;

    }



    /* =====================================================
       NOTE
    ====================================================== */

    if (noteElement) {

        noteElement.value =
            awsData.note || "";

    }

}



/* =========================================================
   LOAD AWS DATA
========================================================= */

async function loadAwsData(user) {

    try {

        const awsProgressRef =
            getAwsProgressRef(user);


        const snapshot =
            await getDoc(awsProgressRef);


        if (snapshot.exists()) {

            const data =
                snapshot.data();


            awsData = {

                progress:
                    Number(data.progress) || 0,

                accuracy:
                    Number(data.accuracy) || 0,

                questionCount:
                    Number(data.questionCount) || 0,

                correctCount:
                    Number(data.correctCount) || 0,

                incorrectCount:
                    Number(data.incorrectCount) || 0,

                targetDate:
                    data.targetDate || "",

                note:
                    data.note || ""

            };

        }


        renderAwsData();


        console.log(
            "AWSデータ読み込み完了",
            awsData
        );

    } catch (error) {

        console.error(
            "AWSデータ読み込みエラー:",
            error
        );

    }

}



/* =========================================================
   SAVE AWS DATA
========================================================= */

async function saveAwsData() {

    if (!currentUser) {

        console.warn(
            "Firebase認証済みユーザーがいません"
        );

        if (saveStatusElement) {

            saveStatusElement.textContent =
                "Firebaseにログインしていないため保存できません。";

        }

        return false;

    }


    try {

        const awsProgressRef =
            getAwsProgressRef(currentUser);


        await setDoc(
            awsProgressRef,
            {

                progress:
                    Number(awsData.progress) || 0,

                accuracy:
                    Number(awsData.accuracy) || 0,

                questionCount:
                    Number(awsData.questionCount) || 0,

                correctCount:
                    Number(awsData.correctCount) || 0,

                incorrectCount:
                    Number(awsData.incorrectCount) || 0,

                targetDate:
                    awsData.targetDate || "",

                note:
                    awsData.note || ""

            }
        );


        console.log(
            "AWSデータ保存完了"
        );


        return true;

    } catch (error) {

        console.error(
            "AWSデータ保存エラー:",
            error
        );


        return false;

    }

}



/* =========================================================
   SAVE SETTINGS
========================================================= */

async function saveSettings() {

    const progress =
        Number(
            progressInputElement
                ? progressInputElement.value
                : 0
        );


    const targetDate =
        targetDateInputElement
            ? targetDateInputElement.value
            : "";


    const note =
        noteElement
            ? noteElement.value
            : "";



    /* =====================================================
       PROGRESS VALIDATION
    ====================================================== */

    let validProgress =
        Number.isFinite(progress)
            ? progress
            : 0;


    validProgress =
        Math.max(
            0,
            Math.min(
                100,
                validProgress
            )
        );



    /* =====================================================
       UPDATE DATA
    ====================================================== */

    awsData.progress =
        validProgress;

    awsData.targetDate =
        targetDate;

    awsData.note =
        note;



    renderAwsData();



    if (saveStatusElement) {

        saveStatusElement.textContent =
            "保存中...";

    }



    const saved =
        await saveAwsData();


    if (saveStatusElement) {

        if (saved) {

            saveStatusElement.textContent =
                "保存しました。";

        } else {

            saveStatusElement.textContent =
                "保存に失敗しました。";

        }

    }



    /* =====================================================
       STATUS RESET
    ====================================================== */

    setTimeout(
        () => {

            if (saveStatusElement) {

                saveStatusElement.textContent =
                    "";

            }

        },
        3000
    );

}



/* =========================================================
   RENDER QUESTION
========================================================= */

function renderQuestion() {

    console.log(
        "renderQuestion() 実行"
    );


    const question =
        questionDatabase[currentQuestionIndex];


    if (!question) {

        console.error(
            "問題データが存在しません"
        );

        return;

    }


    questionAnswered =
        false;



    /* =====================================================
       QUESTION NUMBER
    ====================================================== */

    if (questionNumberElement) {

        questionNumberElement.textContent =
            `QUESTION ${currentQuestionIndex + 1}`;

    }



    /* =====================================================
       QUESTION TEXT
    ====================================================== */

    if (questionTextElement) {

        questionTextElement.textContent =
            question.question;

    }



    /* =====================================================
       RESULT RESET
    ====================================================== */

    if (questionResultElement) {

        questionResultElement.style.display =
            "none";


        questionResultElement.textContent =
            "";

    }



    /* =====================================================
       NEXT BUTTON RESET
    ====================================================== */

    if (nextQuestionButtonElement) {

        nextQuestionButtonElement.style.display =
            "none";

    }



    /* =====================================================
       ANSWERS
    ====================================================== */

    if (answerListElement) {

        answerListElement.innerHTML =
            "";


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

                        answerQuestion(index);

                    }
                );


                answerListElement.appendChild(
                    button
                );

            }
        );

    }

}



/* =========================================================
   ANSWER QUESTION
========================================================= */

async function answerQuestion(
    selectedIndex
) {

    if (questionAnswered) {

        return;

    }


    const question =
        questionDatabase[currentQuestionIndex];


    if (!question) {

        return;

    }


    questionAnswered =
        true;



    /* =====================================================
       ANSWER BUTTONS
    ====================================================== */

    const answerButtons =
        answerListElement
            ? answerListElement.querySelectorAll(
                ".answer-button"
            )
            : [];



    answerButtons.forEach(
        (button) => {

            button.disabled =
                true;

        }
    );



    /* =====================================================
       CHECK ANSWER
    ====================================================== */

    const isCorrect =
        selectedIndex === question.answer;



    /* =====================================================
       BUTTON COLORS
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
       UPDATE STATISTICS
    ====================================================== */

    awsData.questionCount += 1;


    if (isCorrect) {

        awsData.correctCount += 1;

    } else {

        awsData.incorrectCount += 1;

    }



    /* =====================================================
       CALCULATE ACCURACY
    ====================================================== */

    if (
        awsData.questionCount > 0
    ) {

        awsData.accuracy =
            Math.round(
                (
                    awsData.correctCount /
                    awsData.questionCount
                ) * 100
            );

    } else {

        awsData.accuracy =
            0;

    }



    /* =====================================================
       RENDER STATISTICS
    ====================================================== */

    renderAwsData();



    /* =====================================================
       SHOW EXPLANATION
    ====================================================== */

    if (questionResultElement) {

        questionResultElement.style.display =
            "block";


        if (isCorrect) {

            questionResultElement.textContent =
                `正解です。\n\n解説：${question.explanation}`;

        } else {

            questionResultElement.textContent =
                `不正解です。\n\n正解：${question.choices[question.answer]}\n\n解説：${question.explanation}`;

        }

    }



    /* =====================================================
       NEXT QUESTION BUTTON
    ====================================================== */

    if (nextQuestionButtonElement) {

        nextQuestionButtonElement.style.display =
            "block";

    }



    /* =====================================================
       SAVE TO FIREBASE
    ====================================================== */

    const saved =
        await saveAwsData();


    if (!saved) {

        console.warn(
            "問題結果のFirebase保存に失敗しました"
        );

    }

}



/* =========================================================
   NEXT QUESTION
========================================================= */

function nextQuestion() {

    currentQuestionIndex += 1;


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
   SAVE BUTTON
========================================================= */

if (saveButtonElement) {

    saveButtonElement.addEventListener(
        "click",
        saveSettings
    );

}



/* =========================================================
   NEXT BUTTON
========================================================= */

if (nextQuestionButtonElement) {

    nextQuestionButtonElement.addEventListener(
        "click",
        nextQuestion
    );

}



/* =========================================================
   INITIAL QUESTION
========================================================= */

/*
   問題表示はFirebase認証とは独立させる。
   Firebaseに問題があっても、
   問題そのものは表示される。
*/

console.log(
    "AWS SAA JavaScript 読み込み開始"
);


console.log(
    "問題数:",
    questionDatabase.length
);


renderQuestion();



/* =========================================================
   FIREBASE AUTH
========================================================= */

onAuthStateChanged(
    auth,
    async (user) => {

        console.log(
            "Firebase Auth状態:",
            user
        );


        if (user) {

            /* =============================================
               USER LOGIN
            ============================================== */

            currentUser =
                user;


            if (authStatusElement) {

                authStatusElement.textContent =
                    "CONNECTED";

            }


            console.log(
                "Firebase認証成功:",
                user.uid
            );



            /* =============================================
               LOAD AWS DATA
            ============================================== */

            await loadAwsData(
                user
            );


        } else {

            /* =============================================
               USER LOGOUT
            ============================================== */

            currentUser =
                null;


            if (authStatusElement) {

                authStatusElement.textContent =
                    "NOT CONNECTED";

            }


            console.warn(
                "Firebaseユーザー未認証"
            );

        }

    }
);



/* =========================================================
   COMPLETE
========================================================= */

console.log(
    "AWS SAA JavaScript 読み込み完了"
);
