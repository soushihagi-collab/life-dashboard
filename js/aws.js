/* =========================================================
   LIFE DASHBOARD
   AWS SAA
   aws.js
========================================================= */


/* =========================================================
   DOM
========================================================= */

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
   RENDER QUESTION
========================================================= */

function renderQuestion() {

    console.log("renderQuestion() 実行");


    const question =
        questionDatabase[currentQuestionIndex];


    console.log(
        "現在の問題:",
        question
    );


    if (!question) {

        console.error(
            "問題データが存在しません"
        );

        return;

    }


    questionAnswered = false;



    /* =====================================================
       問題番号
    ====================================================== */

    if (questionNumberElement) {

        questionNumberElement.textContent =
            `QUESTION ${currentQuestionIndex + 1}`;

    }



    /* =====================================================
       問題文
    ====================================================== */

    if (questionTextElement) {

        questionTextElement.textContent =
            question.question;

    } else {

        console.error(
            "question-text が見つかりません"
        );

    }



    /* =====================================================
       解説を非表示
    ====================================================== */

    if (questionResultElement) {

        questionResultElement.style.display =
            "none";

        questionResultElement.textContent =
            "";

    }



    /* =====================================================
       次の問題ボタンを非表示
    ====================================================== */

    if (nextQuestionButtonElement) {

        nextQuestionButtonElement.style.display =
            "none";

    }



    /* =====================================================
       選択肢
    ====================================================== */

    if (answerListElement) {

        answerListElement.innerHTML = "";


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

    } else {

        console.error(
            "answer-list が見つかりません"
        );

    }

}



/* =========================================================
   ANSWER
========================================================= */

function answerQuestion(
    selectedIndex
) {

    if (questionAnswered) {

        return;

    }


    questionAnswered = true;


    const question =
        questionDatabase[currentQuestionIndex];


    const answerButtons =
        answerListElement
            ? answerListElement.querySelectorAll(
                ".answer-button"
            )
            : [];



    /* =====================================================
       ボタン無効化
    ====================================================== */

    answerButtons.forEach(
        (button) => {

            button.disabled = true;

        }
    );



    /* =====================================================
       正誤判定
    ====================================================== */

    const isCorrect =
        selectedIndex === question.answer;



    /* =====================================================
       正解・不正解表示
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
       解説表示
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
       次の問題
    ====================================================== */

    if (nextQuestionButtonElement) {

        nextQuestionButtonElement.style.display =
            "block";

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

        currentQuestionIndex = 0;

    }


    renderQuestion();

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
   INITIALIZE
========================================================= */

console.log(
    "AWS SAA JavaScript 読み込み開始"
);


console.log(
    "問題数:",
    questionDatabase.length
);


renderQuestion();


console.log(
    "AWS SAA JavaScript 読み込み完了"
);
