/* =========================================================
   LIFE DASHBOARD
   AWS SAA
   aws.js

   AWS Certified Solutions Architect - Associate

   機能
   ・30問のAWS SAA問題データベース
   ・分野別問題
   ・ランダム出題
   ・同じ問題の連続出題防止
   ・正誤判定
   ・正解 / 不正解表示
   ・詳しい解説
   ・各選択肢の解説
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

    /* =====================================================
       IAM / SECURITY
    ====================================================== */

    {
        category: "IAM / Security",

        question:
            "ある企業では、EC2インスタンス上で実行されるアプリケーションからAmazon S3へアクセスする必要がある。アクセスキーをEC2インスタンス内に保存することなく、AWSのベストプラクティスに従ってアクセスを許可したい。最も適切な方法はどれか。",

        choices: [

            "EC2インスタンス内にIAMユーザーのアクセスキーを保存する",

            "EC2インスタンスにIAMロールを割り当てる",

            "S3バケットをパブリックアクセス可能にする",

            "AWSアカウントのルートユーザーを使用する"

        ],

        answer: 1,

        explanation:
            "EC2からAWSサービスへアクセスする場合は、IAMロールをEC2インスタンスに関連付ける方法が推奨されます。これにより、一時的な認証情報が自動的に提供され、長期間有効なアクセスキーをサーバーへ保存する必要がありません。",

        choiceExplanations: [

            "IAMユーザーのアクセスキーをサーバーへ保存すると、認証情報の漏洩リスクが高まります。",

            "正解です。EC2 IAMロールを使用すると、一時的な認証情報を安全に利用できます。",

            "S3をパブリック公開する必要はありません。むしろ不要な公開はセキュリティリスクになります。",

            "ルートユーザーをアプリケーションから利用することは推奨されません。"
        ]

    },


    {
        category: "IAM / Security",

        question:
            "AWSアカウント内のユーザーに対して、必要な操作だけを許可し、それ以外の権限を与えないようにしたい。このセキュリティ原則はどれか。",

        choices: [

            "Fault Tolerance",

            "Least Privilege",

            "Elasticity",

            "Loose Coupling"

        ],

        answer: 1,

        explanation:
            "Least Privilege（最小権限の原則）は、ユーザーやサービスに必要最低限の権限だけを付与する考え方です。AWS IAMの設計において重要な原則です。",

        choiceExplanations: [

            "Fault Toleranceは、障害が発生してもシステムが継続して動作できる能力です。",

            "正解です。必要最小限の権限だけを付与するのがLeast Privilegeです。",

            "Elasticityは、需要に応じてリソースを増減させる能力です。",

            "Loose Couplingは、システムコンポーネント間の依存関係を弱くする設計です。"
        ]

    },


    {
        category: "IAM / Security",

        question:
            "AWSアカウントのルートユーザーを保護するために、最も適切な対策はどれか。",

        choices: [

            "ルートユーザーを日常的なAWS操作に使用する",

            "ルートユーザーのアクセスキーを各EC2へ配布する",

            "ルートユーザーに多要素認証（MFA）を設定する",

            "ルートユーザーのパスワードをチーム全員で共有する"

        ],

        answer: 2,

        explanation:
            "ルートユーザーは非常に強力な権限を持つため、通常の操作では使用せず、MFAを設定して厳重に保護することが推奨されます。",

        choiceExplanations: [

            "ルートユーザーは日常的な操作には使用しません。",

            "アクセスキーを配布すると重大なセキュリティリスクになります。",

            "正解です。ルートユーザーにはMFAを設定し、利用を最小限にします。",

            "パスワードを共有することはセキュリティ上不適切です。"
        ]

    },


    /* =====================================================
       VPC / NETWORKING
    ====================================================== */

    {
        category: "VPC / Networking",

        question:
            "プライベートサブネットに配置されたEC2インスタンスから、インターネット上のソフトウェアリポジトリへアクセスしたい。ただし、インターネットからEC2への着信接続は許可したくない。最も適切な構成はどれか。",

        choices: [

            "Internet Gatewayのみを使用する",

            "NAT Gatewayをパブリックサブネットに配置する",

            "EC2をパブリックサブネットへ移動する",

            "VPC Peeringを使用する"

        ],

        answer: 1,

        explanation:
            "プライベートサブネットのEC2からインターネットへアウトバウンド通信を行う場合、パブリックサブネットにNAT Gatewayを配置する構成が一般的です。外部からEC2への直接着信は許可する必要がありません。",

        choiceExplanations: [

            "Internet Gatewayだけでは、プライベートサブネットのEC2からインターネットへアクセスするための構成になりません。",

            "正解です。NAT Gatewayをパブリックサブネットに配置し、プライベートサブネットから外向き通信を行います。",

            "EC2をパブリックサブネットへ移動すると、設計上不要なインターネット到達性を持つ可能性があります。",

            "VPC PeeringはVPC間接続用であり、インターネットアクセス用ではありません。"
        ]

    },


    {
        category: "VPC / Networking",

        question:
            "VPC内のEC2インスタンスからAmazon S3へアクセスする際、インターネットゲートウェイやNAT Gatewayを経由せず、AWSネットワーク内で通信したい。最も適切な方法はどれか。",

        choices: [

            "S3 Gateway Endpoint",

            "Internet Gateway",

            "NAT Gateway",

            "Virtual Private Gateway"

        ],

        answer: 0,

        explanation:
            "S3 Gateway Endpointを使用すると、VPC内のリソースからS3へAWSネットワークを経由してアクセスできます。NAT GatewayやInternet Gatewayを必要としません。",

        choiceExplanations: [

            "正解です。S3 Gateway Endpointを利用できます。",

            "Internet Gatewayはインターネットとの接続に使用します。",

            "NAT Gatewayはプライベートサブネットからインターネットへのアウトバウンド通信などに使用します。",

            "Virtual Private Gatewayは主にVPN接続などで使用されます。"
        ]

    },


    {
        category: "VPC / Networking",

        question:
            "企業のオンプレミス環境とAWS VPCをインターネットを経由して安全に接続したい。比較的低コストで構築する場合、最も適切なサービスはどれか。",

        choices: [

            "AWS Direct Connect",

            "AWS Site-to-Site VPN",

            "Amazon CloudFront",

            "VPC Peering"

        ],

        answer: 1,

        explanation:
            "AWS Site-to-Site VPNは、オンプレミス環境とAWS VPCを暗号化されたVPNトンネルで接続できます。専用線であるDirect Connectより一般的に低コストで導入できます。",

        choiceExplanations: [

            "Direct Connectは専用ネットワーク接続であり、より安定した専用接続が必要な場合に適しています。",

            "正解です。Site-to-Site VPNはインターネット経由で暗号化された接続を構築できます。",

            "CloudFrontはCDNサービスであり、オンプレミスとVPCを接続するサービスではありません。",

            "VPC PeeringはAWS VPC同士を接続するための機能です。"
        ]

    },


    {
        category: "VPC / Networking",

        question:
            "複数のVPC間でプライベートIPアドレスを使用した通信を行いたい。各VPCが同じAWSリージョンに存在している。最もシンプルな接続方法はどれか。",

        choices: [

            "VPC Peering",

            "Internet Gateway",

            "CloudFront",

            "NAT Gateway"

        ],

        answer: 0,

        explanation:
            "VPC Peeringを使用すると、2つのVPC間でプライベートIPアドレスを使用した通信が可能になります。",

        choiceExplanations: [

            "正解です。VPC PeeringはVPC間のプライベート接続に使用できます。",

            "Internet Gatewayはインターネットとの通信に使用します。",

            "CloudFrontはコンテンツ配信サービスです。",

            "NAT Gatewayはプライベートサブネットから外部への通信に使用します。"
        ]

    },


    {
        category: "VPC / Networking",

        question:
            "AWS上の複数のVPCとオンプレミスネットワークを、大規模なネットワーク構成として一元的に接続したい。多数のネットワークを接続する際に適したサービスはどれか。",

        choices: [

            "AWS Transit Gateway",

            "Internet Gateway",

            "S3 Gateway Endpoint",

            "NAT Gateway"

        ],

        answer: 0,

        explanation:
            "AWS Transit Gatewayは、複数のVPCやオンプレミスネットワークをハブとして接続するためのサービスです。大規模なネットワーク構成で特に有効です。",

        choiceExplanations: [

            "正解です。Transit Gatewayは複数ネットワークを中央のハブとして接続できます。",

            "Internet GatewayはVPCとインターネットを接続します。",

            "S3 Gateway EndpointはVPCからS3へのプライベートアクセスに使用します。",

            "NAT Gatewayは主にプライベートサブネットから外部への通信に使用します。"
        ]

    },


    /* =====================================================
       EC2
    ====================================================== */

    {
        category: "EC2",

        question:
            "複数のEC2インスタンスへSSHポートを開放したりSSHキーを配布したりすることなく、安全に管理アクセスを行いたい。最も適切なサービスはどれか。",

        choices: [

            "AWS Systems Manager Session Manager",

            "Amazon CloudFront",

            "Amazon Route 53",

            "AWS Direct Connect"

        ],

        answer: 0,

        explanation:
            "Systems Manager Session Managerを使用すると、SSHポートをインターネットへ公開したりSSHキーを管理したりすることなく、EC2へ安全に接続できます。",

        choiceExplanations: [

            "正解です。Session Managerは管理用SSHポートを公開せずにEC2へアクセスできます。",

            "CloudFrontはCDNサービスです。",

            "Route 53はDNSサービスです。",

            "Direct Connectは専用ネットワーク接続サービスです。"
        ]

    },


    {
        category: "EC2",

        question:
            "EC2インスタンスを停止している間のコンピューティング料金を削減したい。インスタンスストアではなくEBSをルートボリュームとして使用している。最も適切な方法はどれか。",

        choices: [

            "EC2インスタンスを停止する",

            "EC2インスタンスを再起動する",

            "インターネットゲートウェイを削除する",

            "Security Groupを削除する"

        ],

        answer: 0,

        explanation:
            "EBS-backed EC2インスタンスは停止することで、インスタンスのコンピューティング料金を削減できます。EBSのストレージ料金などは継続して発生します。",

        choiceExplanations: [

            "正解です。不要な時間帯にEC2を停止することでコンピューティングコストを削減できます。",

            "再起動してもコンピューティング料金の削減にはなりません。",

            "Internet Gatewayを削除することはEC2のコンピューティング料金削減とは関係ありません。",

            "Security Groupを削除してもEC2のコンピューティング料金は削減されません。"
        ]

    },


    {
        category: "EC2",

        question:
            "Webアプリケーションのアクセス量が時間帯によって大きく変動する。アクセス量に応じてEC2インスタンス数を自動的に増減させたい。最も適切なサービスはどれか。",

        choices: [

            "Amazon EC2 Auto Scaling",

            "Amazon S3",

            "AWS CloudTrail",

            "AWS Secrets Manager"

        ],

        answer: 0,

        explanation:
            "EC2 Auto Scalingは、CPU使用率やロードバランサーのリクエスト数などの条件に応じてEC2インスタンス数を自動的に増減できます。",

        choiceExplanations: [

            "正解です。Auto Scalingを利用することで需要に応じてEC2台数を自動調整できます。",

            "S3はオブジェクトストレージサービスです。",

            "CloudTrailはAWS API操作などの監査ログサービスです。",

            "Secrets Managerは認証情報などの機密情報を安全に管理するサービスです。"
        ]

    },


    /* =====================================================
       S3 / STORAGE
    ====================================================== */

    {
        category: "S3 / Storage",

        question:
            "大量の静的コンテンツを保存し、高い耐久性を確保したい。さらに、Webサイトから直接アクセスできるオブジェクトストレージを使用したい。最も適切なサービスはどれか。",

        choices: [

            "Amazon S3",

            "Amazon EBS",

            "Amazon EC2 Instance Store",

            "Amazon RDS"

        ],

        answer: 0,

        explanation:
            "Amazon S3は高い耐久性を持つオブジェクトストレージで、静的コンテンツやバックアップなど幅広い用途に利用できます。",

        choiceExplanations: [

            "正解です。S3はオブジェクトストレージとして静的コンテンツなどを保存できます。",

            "EBSは主にEC2インスタンス用のブロックストレージです。",

            "Instance StoreはEC2に一時的に接続されるローカルストレージです。",

            "RDSはリレーショナルデータベースサービスです。"
        ]

    },


    {
        category: "S3 / Storage",

        question:
            "アクセス頻度が低いバックアップデータをS3に長期間保存したい。保存コストをできるだけ削減したいが、必要になった場合にはデータを取り出したい。適切なS3ストレージクラスはどれか。",

        choices: [

            "S3 Standard",

            "S3 Glacier Flexible Retrieval",

            "S3 Express One Zone",

            "S3 Standard-IA"

        ],

        answer: 1,

        explanation:
            "長期間アクセス頻度が低いアーカイブデータにはS3 Glacier Flexible RetrievalなどのGlacier系ストレージクラスが適しています。",

        choiceExplanations: [

            "S3 Standardは頻繁にアクセスするデータ向けで、アーカイブ用途ではコストが高くなる可能性があります。",

            "正解です。長期保存・低頻度アクセスのアーカイブ用途に適しています。",

            "S3 Express One Zoneは高性能アクセスが必要な用途向けです。",

            "Standard-IAも低頻度アクセス向けですが、長期アーカイブではGlacier系が適するケースがあります。"
        ]

    },


    {
        category: "S3 / Storage",

        question:
            "S3バケット内のオブジェクトを誤って削除した場合に復元できるようにしたい。最も適切な機能はどれか。",

        choices: [

            "S3 Versioning",

            "S3 Transfer Acceleration",

            "S3 Access Points",

            "S3 Static Website Hosting"

        ],

        answer: 0,

        explanation:
            "S3 Versioningを有効にすると、オブジェクトの複数バージョンを保持できます。誤削除した場合にも以前のバージョンを復元できます。",

        choiceExplanations: [

            "正解です。Versioningによって以前のオブジェクトバージョンを保持できます。",

            "Transfer AccelerationはS3へのデータ転送を高速化する機能です。",

            "Access PointsはS3へのアクセス管理を簡素化するための機能です。",

            "Static Website HostingはS3をWebサイトのホスティングに利用する機能です。"
        ]

    },


    {
        category: "S3 / Storage",

        question:
            "オンプレミス環境からS3へ大量のデータを一度移行したい。ネットワーク回線を大量に使用することなく、大量データをAWSへ物理的に転送したい。最も適切なサービスはどれか。",

        choices: [

            "AWS Snowball",

            "Amazon CloudFront",

            "AWS Lambda",

            "Amazon Route 53"

        ],

        answer: 0,

        explanation:
            "AWS Snowballは、大量のデータを物理デバイスに保存してAWSへ転送するために利用できます。ネットワーク帯域が制約となる大規模データ移行に適しています。",

        choiceExplanations: [

            "正解です。Snowballは物理デバイスを利用した大量データ移行に適しています。",

            "CloudFrontはコンテンツ配信サービスです。",

            "Lambdaはサーバーレスコンピューティングサービスです。",

            "Route 53はDNSサービスです。"
        ]

    },


    /* =====================================================
       RDS / DATABASE
    ====================================================== */

    {
        category: "RDS / Database",

        question:
            "リレーショナルデータベースをAWSで運用したい。OSのパッチ適用やデータベースのバックアップなどの管理負担を減らしたい。最も適切なサービスはどれか。",

        choices: [

            "Amazon EC2に自分でデータベースをインストールする",

            "Amazon RDS",

            "Amazon S3",

            "Amazon DynamoDB"

        ],

        answer: 1,

        explanation:
            "Amazon RDSはマネージド型リレーショナルデータベースサービスであり、バックアップやパッチ適用などの運用負担を軽減できます。",

        choiceExplanations: [

            "EC2に自分でデータベースを構築すると、OSやDBの管理負担が増えます。",

            "正解です。RDSはリレーショナルDBの運用をAWSに任せられます。",

            "S3はオブジェクトストレージです。",

            "DynamoDBはNoSQLデータベースです。"
        ]

    },


    {
        category: "RDS / Database",

        question:
            "Amazon RDSデータベースの可用性を高めたい。1つのAvailability Zoneで障害が発生した場合でも、データベースサービスを継続できる構成にしたい。最も適切な方法はどれか。",

        choices: [

            "RDS Multi-AZ",

            "RDS Read Replicaのみを使用する",

            "S3 Versioningを有効にする",

            "CloudFrontを使用する"

        ],

        answer: 0,

        explanation:
            "RDS Multi-AZは、複数のAvailability Zoneにデータベースを配置して高可用性を実現します。プライマリに障害が発生した場合、スタンバイへフェイルオーバーできます。",

        choiceExplanations: [

            "正解です。Multi-AZはRDSの高可用性・フェイルオーバーを実現します。",

            "Read Replicaは主に読み取り負荷の分散やスケーリングに利用されます。",

            "S3 Versioningはオブジェクトストレージの機能です。",

            "CloudFrontはCDNであり、RDSの高可用性機能ではありません。"
        ]

    },


    {
        category: "RDS / Database",

        question:
            "読み取り処理が非常に多いRDSデータベースの負荷を軽減したい。データの読み取り専用コピーを作成し、読み取り処理を分散したい。最も適切な機能はどれか。",

        choices: [

            "RDS Read Replica",

            "RDS Multi-AZ",

            "NAT Gateway",

            "S3 Lifecycle"

        ],

        answer: 0,

        explanation:
            "RDS Read Replicaは、プライマリDBの読み取り専用レプリカを作成し、読み取りワークロードを分散するために使用できます。",

        choiceExplanations: [

            "正解です。Read Replicaは読み取り負荷の分散に利用できます。",

            "Multi-AZの主目的は高可用性・フェイルオーバーです。",

            "NAT Gatewayはネットワーク通信のためのサービスです。",

            "S3 LifecycleはS3オブジェクトのストレージクラス移行などに使用します。"
        ]

    },


    /* =====================================================
       ELB / AUTO SCALING
    ====================================================== */

    {
        category: "ELB / Auto Scaling",

        question:
            "HTTP/HTTPSを使用するWebアプリケーションを複数のEC2インスタンスへ負荷分散したい。パスベースのルーティングも使用したい。最も適切なロードバランサーはどれか。",

        choices: [

            "Application Load Balancer",

            "Network Load Balancer",

            "Gateway Load Balancer",

            "Route 53だけを使用する"

        ],

        answer: 0,

        explanation:
            "Application Load Balancer（ALB）はHTTP/HTTPS向けのロードバランサーで、ホストベース・パスベースのルーティングなどの高度なルーティング機能を提供します。",

        choiceExplanations: [

            "正解です。ALBはHTTP/HTTPSアプリケーションに適しています。",

            "NLBはTCP/UDPなどの高性能なレイヤー4ロードバランシングに適しています。",

            "Gateway Load Balancerは仮想アプライアンスのデプロイなどに使用されます。",

            "Route 53だけではALBのようなアプリケーションレベルの負荷分散はできません。"
        ]

    },


    {
        category: "ELB / Auto Scaling",

        question:
            "EC2 Auto Scalingで、CPU使用率が高くなった場合にインスタンスを自動的に追加したい。どの機能を使用するのが適切か。",

        choices: [

            "Auto Scalingのスケーリングポリシー",

            "S3 Lifecycle",

            "IAM Policy",

            "CloudFront Origin Access Control"

        ],

        answer: 0,

        explanation:
            "Auto Scalingのスケーリングポリシーを使用すると、CPU使用率などのCloudWatchメトリクスを基準としてEC2インスタンス数を自動調整できます。",

        choiceExplanations: [

            "正解です。スケーリングポリシーによって需要に応じた自動スケーリングが可能です。",

            "S3 LifecycleはS3オブジェクト管理機能です。",

            "IAM Policyは権限管理に使用します。",

            "Origin Access ControlはCloudFrontからS3などのオリジンへのアクセス制御に使用します。"
        ]

    },


    {
        category: "ELB / Auto Scaling",

        question:
            "Webアプリケーションを複数のAvailability Zoneに配置し、1つのAZで障害が発生してもサービスを継続したい。最も適切な構成はどれか。",

        choices: [

            "EC2を1つのAZだけに配置する",

            "複数AZのEC2をALBとAuto Scalingで構成する",

            "EC2を1台だけ使用する",

            "S3だけでWebアプリケーションを構築する"

        ],

        answer: 1,

        explanation:
            "複数AZにEC2を配置し、ALBとAuto Scalingを組み合わせることで、AZ障害時にもサービスを継続しやすい高可用性構成を作れます。",

        choiceExplanations: [

            "1つのAZだけではAZ障害時にサービス全体が影響を受ける可能性があります。",

            "正解です。複数AZ + ALB + Auto Scalingは代表的な高可用性構成です。",

            "1台構成ではインスタンス障害に弱くなります。",

            "S3だけでは一般的な動的Webアプリケーションの実行環境にはなりません。"
        ]

    },


    /* =====================================================
       CLOUDFRONT / ROUTE 53
    ====================================================== */

    {
        category: "CloudFront / Route 53",

        question:
            "世界中のユーザーへ静的コンテンツを低レイテンシーで配信したい。ユーザーに近い場所からコンテンツを配信したい。最も適切なサービスはどれか。",

        choices: [

            "Amazon CloudFront",

            "Amazon RDS",

            "Amazon SQS",

            "AWS IAM"

        ],

        answer: 0,

        explanation:
            "CloudFrontはAWSのCDNサービスで、世界中のエッジロケーションを利用してユーザーに近い場所からコンテンツを配信できます。",

        choiceExplanations: [

            "正解です。CloudFrontはCDNとして低レイテンシーなコンテンツ配信を実現します。",

            "RDSはリレーショナルデータベースサービスです。",

            "SQSはメッセージキューサービスです。",

            "IAMはアクセス権限管理サービスです。"
        ]

    },


    {
        category: "CloudFront / Route 53",

        question:
            "アプリケーションへのトラフィックを複数のAWSリージョンへ振り分けたい。DNSベースのルーティングを使用したい。最も適切なサービスはどれか。",

        choices: [

            "Amazon Route 53",

            "Amazon S3",

            "AWS Lambda",

            "Amazon EBS"

        ],

        answer: 0,

        explanation:
            "Amazon Route 53はDNSサービスであり、レイテンシーベースルーティングやフェイルオーバールーティングなどを利用してトラフィックを複数リージョンへ振り分けられます。",

        choiceExplanations: [

            "正解です。Route 53はDNSベースのルーティングに使用できます。",

            "S3はオブジェクトストレージサービスです。",

            "Lambdaはサーバーレスコンピューティングサービスです。",

            "EBSはEC2向けのブロックストレージです。"
        ]

    },


    /* =====================================================
       SERVERLESS
    ====================================================== */

    {
        category: "Serverless",

        question:
            "画像がS3へアップロードされたときに、自動的に画像処理を実行したい。サーバーを常時稼働させたくない。最も適切なサービスはどれか。",

        choices: [

            "AWS Lambda",

            "Amazon EC2を常時稼働させる",

            "Amazon RDS",

            "AWS Direct Connect"

        ],

        answer: 0,

        explanation:
            "S3イベントをトリガーとしてLambda関数を実行することで、画像アップロード時にサーバーレスで処理を実行できます。",

        choiceExplanations: [

            "正解です。S3イベントをLambdaのトリガーとして利用できます。",

            "EC2を常時稼働させるとサーバー管理やコストが発生します。",

            "RDSはデータベースサービスです。",

            "Direct Connectはネットワーク接続サービスです。"
        ]

    },


    {
        category: "Serverless",

        question:
            "ユーザーからのHTTPリクエストを受け取り、バックエンド処理をサーバーレスで実行したい。APIの入口として使用できるAWSサービスはどれか。",

        choices: [

            "Amazon API Gateway",

            "Amazon EBS",

            "AWS Snowball",

            "Amazon S3 Glacier"

        ],

        answer: 0,

        explanation:
            "Amazon API GatewayはAPIの作成・公開・管理を行えるマネージドサービスで、Lambdaなどのバックエンドと組み合わせてサーバーレスAPIを構築できます。",

        choiceExplanations: [

            "正解です。API GatewayはLambdaなどと組み合わせてサーバーレスAPIを構築できます。",

            "EBSはブロックストレージです。",

            "Snowballは大規模データ移行などに使用します。",

            "S3 Glacierはアーカイブ用ストレージです。"
        ]

    },


    /* =====================================================
       HIGH AVAILABILITY / DR
    ====================================================== */

    {
        category: "High Availability / DR",

        question:
            "Webアプリケーションを複数のAvailability Zoneに配置する主な目的はどれか。",

        choices: [

            "単一AZ障害への耐性を高める",

            "IAMユーザーを作成する",

            "S3の保存容量を増やす",

            "DNSレコードを暗号化する"

        ],

        answer: 0,

        explanation:
            "複数のAvailability Zoneにリソースを分散配置することで、1つのAZに障害が発生してもサービスを継続できる可能性を高められます。",

        choiceExplanations: [

            "正解です。Multi-AZ構成は可用性と障害耐性を高める基本的な設計です。",

            "IAMユーザー作成はAZ構成とは関係ありません。",

            "S3の容量拡張が目的ではありません。",

            "DNSレコードの暗号化が目的ではありません。"
        ]

    },


    {
        category: "High Availability / DR",

        question:
            "AWS上のアプリケーションで障害が発生した場合に備えて、別リージョンへバックアップを保存したい。S3を使用している。最も適切な方法の1つはどれか。",

        choices: [

            "S3 Cross-Region Replication",

            "EC2 Instance Store",

            "EBSスナップショットを1つのAZだけに保存する",

            "Security Group"

        ],

        answer: 0,

        explanation:
            "S3 Cross-Region Replication（CRR）を使用すると、S3オブジェクトを別のAWSリージョンへ自動的に複製できます。リージョン障害に備えたDR対策として利用できます。",

        choiceExplanations: [

            "正解です。CRRによって別リージョンへオブジェクトを複製できます。",

            "Instance StoreはEC2のローカルストレージであり、DR用の永続バックアップには適していません。",

            "1つのAZだけに保存するとリージョン障害への対策にはなりません。",

            "Security Groupはネットワークアクセス制御機能です。"
        ]

    },


    {
        category: "High Availability / DR",

        question:
            "アプリケーションの障害時に、できるだけ短時間で別環境へ切り替えたい。通常時は最小限のリソースだけを稼働させ、障害時にスケールアップするDR戦略を採用したい。最も適切な戦略はどれか。",

        choices: [

            "Backup and Restore",

            "Pilot Light",

            "Warm Standby",

            "Multi-Site Active/Active"

        ],

        answer: 2,

        explanation:
            "Warm Standbyでは、縮小された本番相当環境を別環境で稼働させ、障害時にスケールアップして本番トラフィックを処理します。Pilot Lightよりも迅速に切り替えられる一方、常時Active/Activeよりコストを抑えられます。",

        choiceExplanations: [

            "Backup and Restoreは最もシンプルですが、復旧までの時間が長くなりやすい戦略です。",

            "Pilot Lightは最小限のコアコンポーネントを稼働させる戦略で、Warm Standbyより復旧に時間がかかる場合があります。",

            "正解です。Warm Standbyは縮小された環境を稼働させ、障害時にスケールアップします。",

            "Multi-Site Active/Activeは高い可用性と短い復旧時間を実現できますが、通常時から複数環境を稼働させるためコストが高くなります。"
        ]

    },


    /* =====================================================
       COST OPTIMIZATION
    ====================================================== */

    {
        category: "Cost Optimization",

        question:
            "EC2インスタンスを24時間365日、長期間にわたって安定して使用する予定である。オンデマンド料金よりもコストを削減したい。最も適切な選択肢はどれか。",

        choices: [

            "Savings Plans",

            "NAT Gateway",

            "CloudFront",

            "S3 Transfer Acceleration"

        ],

        answer: 0,

        explanation:
            "長期間安定してコンピューティングリソースを使用する場合、Savings Plansによってオンデマンド料金より低い料金を利用できる場合があります。",

        choiceExplanations: [

            "正解です。Savings Plansは一定の利用コミットメントと引き換えにコンピューティングコストを削減できます。",

            "NAT Gatewayはネットワーク通信のためのサービスです。",

            "CloudFrontはCDNサービスです。",

            "S3 Transfer AccelerationはS3へのデータ転送を高速化する機能です。"
        ]

    },


    {
        category: "Cost Optimization",

        question:
            "毎月数日間だけ大量のEC2コンピューティングリソースが必要になる。必要な期間だけEC2を使用し、それ以外の期間はリソースを使用しない。コスト最適化の観点で基本的に適切な考え方はどれか。",

        choices: [

            "不要な期間もEC2を常時稼働させる",

            "需要がない期間はEC2を停止または削除する",

            "すべてのEC2をDedicated Hostにする",

            "すべてのEC2を常時最大サイズにする"

        ],

        answer: 1,

        explanation:
            "需要がない期間にコンピューティングリソースを停止・削除することで、不要なコンピューティングコストを削減できます。",

        choiceExplanations: [

            "不要な期間まで稼働させると、不要なコンピューティング料金が発生します。",

            "正解です。需要に合わせてリソースを停止・削除することは基本的なコスト最適化です。",

            "Dedicated Hostは特殊なライセンス要件などがある場合に使用するもので、単純なコスト削減策ではありません。",

            "常時最大サイズにすると、需要が少ない期間にも過剰なコストが発生します。"
        ]

    }

];



/* =========================================================
   QUESTION STATE
========================================================= */

let currentQuestionIndex = 0;

let currentQuestion = null;

let questionAnswered = false;

let previousQuestionIndex = -1;



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
            await getDoc(
                awsProgressRef
            );


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
            getAwsProgressRef(
                currentUser
            );


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
   GET RANDOM QUESTION
========================================================= */

function getRandomQuestion() {

    if (
        questionDatabase.length === 0
    ) {

        return null;

    }


    let randomIndex =
        Math.floor(
            Math.random() *
            questionDatabase.length
        );


    /*
       直前と同じ問題を防止
    */

    if (
        questionDatabase.length > 1
        &&
        randomIndex === previousQuestionIndex
    ) {

        randomIndex += 1;


        if (
            randomIndex >=
            questionDatabase.length
        ) {

            randomIndex = 0;

        }

    }


    previousQuestionIndex =
        randomIndex;


    currentQuestionIndex =
        randomIndex;


    return questionDatabase[
        randomIndex
    ];

}



/* =========================================================
   RENDER QUESTION
========================================================= */

function renderQuestion() {

    console.log(
        "renderQuestion() 実行"
    );


    const question =
        getRandomQuestion();


    if (!question) {

        console.error(
            "問題データが存在しません"
        );

        return;

    }


    currentQuestion =
        question;


    questionAnswered =
        false;



    /* =====================================================
       QUESTION NUMBER
    ====================================================== */

    if (questionNumberElement) {

        questionNumberElement.textContent =
            `QUESTION ${awsData.questionCount + 1}`;

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

                        answerQuestion(
                            index
                        );

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


    if (!currentQuestion) {

        return;

    }


    const question =
        currentQuestion;


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
        selectedIndex ===
        question.answer;



    /* =====================================================
       BUTTON COLORS
    ====================================================== */

    answerButtons.forEach(
        (button, index) => {

            if (
                index ===
                question.answer
            ) {

                button.classList.add(
                    "correct"
                );

            }


            if (
                index === selectedIndex
                &&
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
       BUILD EXPLANATION
    ====================================================== */

    let resultText = "";


    if (isCorrect) {

        resultText +=
            "正解です。\n\n";

    } else {

        resultText +=
            "不正解です。\n\n";

        resultText +=
            `正解：${question.choices[question.answer]}\n\n`;

    }


    resultText +=
        `【解説】\n${question.explanation}\n\n`;


    resultText +=
        "【各選択肢のポイント】\n";


    question.choiceExplanations.forEach(
        (explanation, index) => {

            resultText +=
                `\n${index + 1}. ${explanation}`;

        }
    );



    /* =====================================================
       SHOW RESULT
    ====================================================== */

    if (questionResultElement) {

        questionResultElement.style.display =
            "block";


        questionResultElement.textContent =
            resultText;

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
