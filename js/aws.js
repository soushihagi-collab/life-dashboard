/* =========================================================
   LIFE DASHBOARD
   AWS SAA
   aws.js

   FULL VERSION

   Features
   - Firebase Authentication
   - Firestore persistence
   - Study progress
   - Question history
   - Category analytics
   - Weak area detection
   - Wrong question review
   - Favorites
   - Difficulty filtering
   - Daily / weekly statistics
   - Study streak
   - Study goals
   - Mock exam
   ========================================================= */


import {

    doc,
    getDoc,
    setDoc,
    addDoc,
    collection,
    getDocs,
    deleteDoc,
    query,
    where,
    Timestamp,
    onAuthStateChanged

} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


import {

    onAuthStateChanged as onAuthStateChangedAuth

} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";


import {

    db,
    auth

} from "./firebase.js";



/* =========================================================
   GLOBAL STATE
========================================================= */


let currentUser = null;

let currentQuestion = null;

let previousQuestionId = null;

let currentFilter = "all";

let favoriteQuestionIds = new Set();

let wrongQuestionIds = new Set();

let questionHistory = [];

let currentStudyQuestions = [];

let currentStudyIndex = 0;


/* =========================================================
   STUDY MODE
========================================================= */

let studyMode = "normal";


/* =========================================================
   MOCK EXAM STATE
========================================================= */

let mockQuestions = [];

let mockAnswers = [];

let mockMarked = [];

let mockCurrentIndex = 0;

let mockStartedAt = null;

let mockTimerInterval = null;

const MOCK_TOTAL = 65;

const MOCK_TIME_SECONDS = 120 * 60;



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

    targetQuestions: 1000,

    dailyTarget: 10,

    note: ""

};



/* =========================================================
   CATEGORIES
========================================================= */

const categories = [

    "IAM / Security",

    "VPC / Networking",

    "EC2",

    "S3 / Storage",

    "RDS / Database",

    "ELB / Auto Scaling",

    "CloudFront / Route 53",

    "Serverless",

    "High Availability / DR",

    "Cost Optimization"

];



/* =========================================================
   QUESTION DATABASE
========================================================= */

const questionDatabase = [

    /* =====================================================
       IAM / SECURITY
    ===================================================== */

    {

        id: "iam-001",

        category: "IAM / Security",

        difficulty: "EASY",

        question:
            "EC2インスタンスからS3バケットへアクセスさせる場合、アクセスキーをEC2内に保存せずにAWSリソースへアクセスするための推奨方法はどれですか？",

        choices: [

            "IAMユーザーのアクセスキーを環境変数に保存する",

            "IAMロールをEC2インスタンスに関連付ける",

            "S3バケットをパブリック公開する",

            "ルートユーザーのアクセスキーを使用する"

        ],

        answer: 1,

        explanation:
            "EC2からAWSサービスへアクセスする場合は、IAMロールをEC2インスタンスプロファイルとして関連付けるのが推奨です。認証情報をアプリケーションへ直接保存する必要がありません。",

        choiceExplanations: [

            "長期的なアクセスキーを保存するため、推奨されません。",

            "正解です。IAMロールによる一時的な認証情報を利用できます。",

            "セキュリティ上、S3をパブリック公開する必要はありません。",

            "ルートユーザーのアクセスキー利用は推奨されません。"

        ]

    },


    {

        id: "iam-002",

        category: "IAM / Security",

        difficulty: "MEDIUM",

        question:
            "AWSアカウント内のユーザーが特定のリージョンでEC2を起動できないようにしたいとします。複数のIAMポリシーより上位で組織全体の権限制御を行うサービスはどれですか？",

        choices: [

            "Security Group",

            "AWS Organizations SCP",

            "NACL",

            "Route 53"

        ],

        answer: 1,

        explanation:
            "AWS OrganizationsのService Control Policies（SCP）は、組織内のアカウントで利用できる最大権限を制御します。",

        choiceExplanations: [

            "Security Groupはネットワーク通信を制御します。",

            "正解です。SCPはAWS Organizationsでアカウントの最大権限を制御します。",

            "NACLはサブネットレベルのネットワークアクセス制御です。",

            "Route 53はDNSサービスです。"

        ]

    },


    {

        id: "iam-003",

        category: "IAM / Security",

        difficulty: "HARD",

        question:
            "ある企業がAWSアカウント間で安全にアクセス権を委任したいと考えています。長期的なアクセスキーを共有せず、一時的な認証情報を利用する方法はどれですか？",

        choices: [

            "IAMユーザーのアクセスキーを共有する",

            "AWS STS AssumeRoleを利用する",

            "ルートユーザーでログインする",

            "S3 ACLを利用する"

        ],

        answer: 1,

        explanation:
            "STS AssumeRoleを利用すると、IAMロールを引き受け、一時的なセキュリティ認証情報を取得できます。",

        choiceExplanations: [

            "長期認証情報の共有となるため推奨されません。",

            "正解です。STS AssumeRoleで一時認証情報を取得できます。",

            "ルートユーザー利用は推奨されません。",

            "S3 ACLはロール引き受けの仕組みではありません。"

        ]

    },



    /* =====================================================
       VPC / NETWORKING
    ===================================================== */

    {

        id: "vpc-001",

        category: "VPC / Networking",

        difficulty: "EASY",

        question:
            "プライベートサブネットのEC2からS3へアクセスしたいが、インターネットを経由させたくありません。最も適切な方法はどれですか？",

        choices: [

            "Internet Gateway",

            "S3 Gateway VPC Endpoint",

            " NAT Gateway ",

            "CloudFront"

        ],

        answer: 1,

        explanation:
            "S3にはGateway VPC Endpointを利用できます。VPC内部からS3へプライベートにアクセスできます。",

        choiceExplanations: [

            "Internet Gatewayはインターネット接続用です。",

            "正解です。S3 Gateway Endpointを利用できます。",

            "NAT Gateway経由でも可能ですが、S3への専用プライベート経路としてはGateway Endpointが適切です。",

            "CloudFrontはCDNサービスです。"

        ]

    },


    {

        id: "vpc-002",

        category: "VPC / Networking",

        difficulty: "MEDIUM",

        question:
            "プライベートサブネットのEC2からインターネット上のアップデートサーバーへアクセスする必要があります。外部からEC2へ直接接続されない構成はどれですか？",

        choices: [

            "Internet Gatewayのみ",

            "NAT Gateway",

            "パブリックIPをEC2に付与",

            "Elastic IPをEC2に直接付与"

        ],

        answer: 1,

        explanation:
            "プライベートサブネットから外向きのインターネット通信を行う場合、NAT Gatewayが代表的な構成です。",

        choiceExplanations: [

            "プライベートサブネットから直接利用する構成ではありません。",

            "正解です。NAT Gatewayによって外向き通信が可能になります。",

            "EC2を直接インターネットへ公開することになります。",

            "同様に直接公開する構成になります。"

        ]

    },


    {

        id: "vpc-003",

        category: "VPC / Networking",

        difficulty: "HARD",

        question:
            "オンプレミス環境からVPC内のプライベートリソースへ専用線で接続し、安定したネットワーク品質を確保したいとします。最適な選択肢はどれですか？",

        choices: [

            "Site-to-Site VPN",

            "AWS Direct Connect",

            "Internet Gateway",

            "NAT Gateway"

        ],

        answer: 1,

        explanation:
            "専用線接続による安定したネットワークを求める場合、AWS Direct Connectが適しています。",

        choiceExplanations: [

            "VPNはインターネット経由の暗号化接続です。",

            "正解です。Direct Connectは専用線接続を提供します。",

            "インターネット接続用です。",

            "外向きインターネット通信に利用します。"

        ]

    },


    {

        id: "vpc-004",

        category: "VPC / Networking",

        difficulty: "HARD",

        question:
            "複数VPC間でAWS PrivateLinkを使用してサービスを非公開で提供したいとします。サービス提供側で使用する主要なコンポーネントはどれですか？",

        choices: [

            "Network Load Balancer",

            "Internet Gateway",

            "NAT Gateway",

            "Route 53 Resolver"

        ],

        answer: 0,

        explanation:
            "AWS PrivateLinkでは、サービス提供側にNetwork Load Balancerを配置する構成が一般的です。",

        choiceExplanations: [

            "正解です。PrivateLinkのエンドポイントサービスではNLBを利用します。",

            "インターネット接続用です。",

            "NAT Gatewayは外向き通信向けです。",

            "DNS関連の機能です。"

        ]

    },


    {

        id: "vpc-005",

        category: "VPC / Networking",

        difficulty: "MEDIUM",

        question:
            "セキュリティグループとネットワークACLの違いとして正しいものはどれですか？",

        choices: [

            "Security Groupはステートフル、NACLはステートレス",

            "Security Groupはサブネット単位、NACLはインスタンス単位",

            "両方とも完全に同じ",

            "NACLはアウトバウンド通信を制御できない"

        ],

        answer: 0,

        explanation:
            "Security Groupはステートフル、Network ACLはステートレスです。またSecurity GroupはENI単位、NACLはサブネット単位で適用されます。",

        choiceExplanations: [

            "正解です。重要なSAA頻出ポイントです。",

            "逆です。",

            "適用単位やステート性が異なります。",

            "NACLはインバウンド・アウトバウンドの両方を制御できます。"

        ]

    },



    /* =====================================================
       EC2
    ===================================================== */

    {

        id: "ec2-001",

        category: "EC2",

        difficulty: "EASY",

        question:
            "EC2インスタンスのOSへSSH接続することなく、AWSコンソールから管理操作を行いたい場合に利用できるサービスはどれですか？",

        choices: [

            "AWS Systems Manager",

            "CloudFront",

            "Route 53",

            "S3"

        ],

        answer: 0,

        explanation:
            "AWS Systems Manager Session Managerを使用すると、SSHポートを公開せずにEC2へ接続できます。",

        choiceExplanations: [

            "正解です。Session Managerによる管理が可能です。",

            "CDNサービスです。",

            "DNSサービスです。",

            "オブジェクトストレージです。"

        ]

    },


    {

        id: "ec2-002",

        category: "EC2",

        difficulty: "MEDIUM",

        question:
            "突然の負荷増加に対してEC2台数を自動的に増減させたい場合に利用するサービスはどれですか？",

        choices: [

            "Auto Scaling",

            "AWS Backup",

            "CloudTrail",

            "IAM"

        ],

        answer: 0,

        explanation:
            "EC2 Auto Scalingを利用すると、負荷やスケジュールなどに応じてインスタンス数を自動調整できます。",

        choiceExplanations: [

            "正解です。EC2の台数を自動調整できます。",

            "バックアップサービスです。",

            "API操作の監査ログサービスです。",

            "アクセス権管理サービスです。"

        ]

    },


    {

        id: "ec2-003",

        category: "EC2",

        difficulty: "HARD",

        question:
            "アプリケーションを変更せずに、EC2インスタンスの障害時もサービスを継続したいとします。複数AZへEC2を分散し、ロードバランサーを利用する構成が適切な理由はどれですか？",

        choices: [

            "単一AZ障害の影響を低減できる",

            "EC2のCPU性能が2倍になる",

            "S3の容量が増える",

            "IAM権限が自動付与される"

        ],

        answer: 0,

        explanation:
            "複数AZへリソースを分散することで、単一AZの障害によるサービス停止リスクを低減できます。",

        choiceExplanations: [

            "正解です。高可用性設計の基本です。",

            "CPU性能そのものは変化しません。",

            "S3容量とは関係ありません。",

            "IAM権限が自動付与されるわけではありません。"

        ]

    },



    /* =====================================================
       S3
    ===================================================== */

    {

        id: "s3-001",

        category: "S3 / Storage",

        difficulty: "EASY",

        question:
            "アクセス頻度が低いが、必要になったときすぐ取得できるS3オブジェクトの保存先として適切なのはどれですか？",

        choices: [

            "S3 Standard",

            "S3 Glacier Deep Archive",

            "S3 Standard-IA",

            "Amazon EFS"

        ],

        answer: 2,

        explanation:
            "S3 Standard-IAはアクセス頻度が低いデータ向けで、Standardより低いストレージ料金で利用できます。",

        choiceExplanations: [

            "頻繁にアクセスするデータ向けです。",

            "長期アーカイブ向けで、取得に時間がかかる場合があります。",

            "正解です。低頻度アクセス向けです。",

            "ファイルシステムサービスです。"

        ]

    },


    {

        id: "s3-002",

        category: "S3 / Storage",

        difficulty: "MEDIUM",

        question:
            "S3バケット内のオブジェクトを誤って削除した場合に復元できるようにしたい場合、基本的な機能はどれですか？",

        choices: [

            "Versioning",

            "Security Group",

            "Auto Scaling",

            "CloudFront"

        ],

        answer: 0,

        explanation:
            "S3 Versioningを有効にすると、オブジェクトの複数バージョンを保持できます。",

        choiceExplanations: [

            "正解です。誤削除からの復元に利用できます。",

            "ネットワークアクセス制御です。",

            "EC2台数調整です。",

            "CDNです。"

        ]

    },


    {

        id: "s3-003",

        category: "S3 / Storage",

        difficulty: "HARD",

        question:
            "大量のS3オブジェクトを一定期間後に自動的に低コストストレージへ移行したい場合、最適な機能はどれですか？",

        choices: [

            "S3 Lifecycle",

            "CloudTrail",

            "AWS Config",

            "IAM Policy"

        ],

        answer: 0,

        explanation:
            "S3 Lifecycleルールを利用すると、オブジェクトを一定期間後に別ストレージクラスへ移行したり削除したりできます。",

        choiceExplanations: [

            "正解です。ストレージクラス移行や削除を自動化できます。",

            "監査ログサービスです。",

            "AWSリソースの設定管理サービスです。",

            "アクセス権を定義する仕組みです。"

        ]

    },


    {

        id: "s3-004",

        category: "S3 / Storage",

        difficulty: "MEDIUM",

        question:
            "S3へ保存するデータを暗号化したい場合に利用できる代表的な暗号化方式はどれですか？",

        choices: [

            "SSE-S3",

            "Security Group",

            "NACL",

            "Route Table"

        ],

        answer: 0,

        explanation:
            "S3ではSSE-S3、SSE-KMSなどのサーバーサイド暗号化を利用できます。",

        choiceExplanations: [

            "正解です。S3のサーバーサイド暗号化方式です。",

            "ネットワークアクセス制御です。",

            "サブネットレベルのアクセス制御です。",

            "ルーティング制御です。"

        ]

    },



    /* =====================================================
       RDS
    ===================================================== */

    {

        id: "rds-001",

        category: "RDS / Database",

        difficulty: "EASY",

        question:
            "Amazon RDSで高可用性を実現するため、別AZへ同期的にスタンバイDBを配置する機能はどれですか？",

        choices: [

            "Read Replica",

            "Multi-AZ",

            "DynamoDB",

            "ElastiCache"

        ],

        answer: 1,

        explanation:
            "RDS Multi-AZは高可用性を目的としてスタンバイDBを別AZに配置します。",

        choiceExplanations: [

            "Read Replicaは主に読み取りスケールやレポート用途です。",

            "正解です。Multi-AZは高可用性のための機能です。",

            "NoSQLデータベースサービスです。",

            "インメモリキャッシュサービスです。"

        ]

    },


    {

        id: "rds-002",

        category: "RDS / Database",

        difficulty: "MEDIUM",

        question:
            "読み取り処理が非常に多いRDSデータベースの負荷を軽減したい場合、適切な方法はどれですか？",

        choices: [

            "Read Replica",

            "Multi-AZだけを追加",

            "IAMユーザーを増やす",

            "S3 Glacierを利用"

        ],

        answer: 0,

        explanation:
            "Read Replicaを利用すると読み取り処理をレプリカへ分散できます。",

        choiceExplanations: [

            "正解です。読み取り負荷のスケールアウトに利用できます。",

            "Multi-AZは主に高可用性目的です。",

            "IAMユーザー数とDB読み取り性能は直接関係しません。",

            "アーカイブストレージです。"

        ]

    },


    {

        id: "rds-003",

        category: "RDS / Database",

        difficulty: "HARD",

        question:
            "データベースの自動バックアップを利用し、障害発生時に特定時点まで復元したい場合、利用できるRDSの機能はどれですか？",

        choices: [

            "Point-in-Time Recovery",

            "Security Group",

            "CloudFront",

            "Auto Scaling"

        ],

        answer: 0,

        explanation:
            "RDSでは自動バックアップを利用してPoint-in-Time Recoveryを実行できます。",

        choiceExplanations: [

            "正解です。特定時点までのDB復元に利用できます。",

            "ネットワークアクセス制御です。",

            "CDNです。",

            "EC2台数調整です。"

        ]

    },



    /* =====================================================
       ELB / AUTO SCALING
    ===================================================== */

    {

        id: "elb-001",

        category: "ELB / Auto Scaling",

        difficulty: "EASY",

        question:
            "HTTP/HTTPSアプリケーションのトラフィックを複数のEC2インスタンスへ分散したい場合、一般的に利用するロードバランサーはどれですか？",

        choices: [

            "Application Load Balancer",

            "NAT Gateway",

            "Internet Gateway",

            "Route Table"

        ],

        answer: 0,

        explanation:
            "Application Load BalancerはHTTP/HTTPSなどのアプリケーションレイヤーのトラフィック分散に適しています。",

        choiceExplanations: [

            "正解です。HTTP/HTTPSのロードバランシングに適しています。",

            "アウトバウンド通信向けです。",

            "インターネット接続用です。",

            "ルーティング設定です。"

        ]

    },


    {

        id: "elb-002",

        category: "ELB / Auto Scaling",

        difficulty: "MEDIUM",

        question:
            "Auto Scaling GroupのEC2インスタンスが異常になった場合、異常なインスタンスを終了し新しいインスタンスを起動するために利用される仕組みはどれですか？",

        choices: [

            "Health Check",

            "S3 Versioning",

            "IAM Policy",

            "CloudFront Cache"

        ],

        answer: 0,

        explanation:
            "Auto Scalingではヘルスチェックによって異常なインスタンスを検出し、必要に応じて置き換えます。",

        choiceExplanations: [

            "正解です。インスタンスの正常性確認に利用されます。",

            "S3オブジェクトのバージョン管理です。",

            "権限管理です。",

            "CDNキャッシュです。"

        ]

    },


    {

        id: "elb-003",

        category: "ELB / Auto Scaling",

        difficulty: "HARD",

        question:
            "アプリケーションへのアクセスが時間帯によって大きく変動します。負荷に応じてEC2台数を自動調整したい場合、適切な構成はどれですか？",

        choices: [

            "Auto Scaling Group + CloudWatch",

            "S3 + Glacier",

            "IAM + SCP",

            "Route 53 + S3"

        ],

        answer: 0,

        explanation:
            "CloudWatchメトリクスを利用したAuto Scalingによって、負荷に応じたEC2台数の自動調整が可能です。",

        choiceExplanations: [

            "正解です。代表的な動的スケーリング構成です。",

            "ストレージ用途です。",

            "権限管理用途です。",

            "DNSとストレージの組み合わせです。"

        ]

    },



    /* =====================================================
       CLOUDFRONT / ROUTE53
    ===================================================== */

    {

        id: "cdn-001",

        category: "CloudFront / Route 53",

        difficulty: "EASY",

        question:
            "世界中のユーザーへWebコンテンツを低レイテンシーで配信したい場合に利用する代表的なAWSサービスはどれですか？",

        choices: [

            "CloudFront",

            "RDS",

            "IAM",

            "SQS"

        ],

        answer: 0,

        explanation:
            "Amazon CloudFrontはAWSのグローバルなCDNサービスです。",

        choiceExplanations: [

            "正解です。エッジロケーションからコンテンツを配信します。",

            "リレーショナルデータベースです。",

            "アクセス管理サービスです。",

            "メッセージキューサービスです。"

        ]

    },


    {

        id: "cdn-002",

        category: "CloudFront / Route 53",

        difficulty: "MEDIUM",

        question:
            "DNSの名前解決をAWS上で提供するサービスはどれですか？",

        choices: [

            "Route 53",

            "CloudFront",

            "S3",

            "EBS"

        ],

        answer: 0,

        explanation:
            "Amazon Route 53はDNSサービスです。",

        choiceExplanations: [

            "正解です。DNS、ドメイン登録、ヘルスチェックなどを提供します。",

            "CDNサービスです。",

            "オブジェクトストレージです。",

            "ブロックストレージです。"

        ]

    },



    /* =====================================================
       SERVERLESS
    ===================================================== */

    {

        id: "serverless-001",

        category: "Serverless",

        difficulty: "EASY",

        question:
            "サーバーを管理せず、イベント発生時にコードを実行したい場合に利用する代表的なサービスはどれですか？",

        choices: [

            "AWS Lambda",

            "EC2",

            "EBS",

            "Direct Connect"

        ],

        answer: 0,

        explanation:
            "AWS Lambdaはサーバーをプロビジョニング・管理せずにコードを実行できるサーバーレスサービスです。",

        choiceExplanations: [

            "正解です。イベント駆動でコードを実行できます。",

            "仮想サーバーサービスです。",

            "ブロックストレージです。",

            "専用ネットワーク接続サービスです。"

        ]

    },


    {

        id: "serverless-002",

        category: "Serverless",

        difficulty: "HARD",

        question:
            "大量のメッセージを一時的に保持し、処理するアプリケーション間を疎結合にしたい場合、適切なサービスはどれですか？",

        choices: [

            "Amazon SQS",

            "Amazon Route 53",

            "Amazon EBS",

            "IAM"

        ],

        answer: 0,

        explanation:
            "Amazon SQSはメッセージキューサービスであり、アプリケーション間の疎結合化に利用できます。",

        choiceExplanations: [

            "正解です。非同期処理や疎結合化に利用できます。",

            "DNSサービスです。",

            "ブロックストレージです。",

            "権限管理サービスです。"

        ]

    },



    /* =====================================================
       HA / DR
    ===================================================== */

    {

        id: "dr-001",

        category: "High Availability / DR",

        difficulty: "MEDIUM",

        question:
            "リージョン全体の障害に備えて、別リージョンへデータを複製しておきたい場合に利用できる代表的な方法はどれですか？",

        choices: [

            "Cross-Region Replication",

            "Security Group",

            "NACL",

            "Elastic IP"

        ],

        answer: 0,

        explanation:
            "S3 Cross-Region Replicationなど、AWSにはリージョン間でデータを複製する仕組みがあります。",

        choiceExplanations: [

            "正解です。リージョン障害へのDR対策として利用できます。",

            "ネットワークアクセス制御です。",

            "サブネットアクセス制御です。",

            "固定IPアドレスです。"

        ]

    },


    {

        id: "dr-002",

        category: "High Availability / DR",

        difficulty: "HARD",

        question:
            "災害対策において、通常時は最小限のリソースだけを稼働させ、障害時に迅速に本番環境を拡張する方式はどれですか？",

        choices: [

            "Pilot Light",

            "Multi-AZ",

            "Single-AZ",

            "Caching"

        ],

        answer: 0,

        explanation:
            "Pilot Lightでは最低限必要なコアリソースを稼働させ、災害時に他のリソースを起動して環境を拡張します。",

        choiceExplanations: [

            "正解です。DR戦略の一つです。",

            "単一リージョン内のAZ冗長化です。",

            "可用性が低くなります。",

            "キャッシュ戦略です。"

        ]

    },


    {

        id: "dr-003",

        category: "High Availability / DR",

        difficulty: "HARD",

        question:
            "RTOを可能な限り短くしたい場合、一般的に最も高速な復旧が期待できるDR戦略はどれですか？",

        choices: [

            "Backup and Restore",

            "Pilot Light",

            "Warm Standby",

            "Multi-site / Hot Standby"

        ],

        answer: 3,

        explanation:
            "Multi-site / Hot Standbyでは別環境がほぼ本番状態で稼働しているため、一般的に最も短いRTOを実現しやすい方式です。",

        choiceExplanations: [

            "復旧まで時間がかかります。",

            "必要なコンポーネントを起動する必要があります。",

            "一定規模の環境を常時稼働させます。",

            "正解です。ほぼ本番環境を常時稼働させます。"

        ]

    },



    /* =====================================================
       COST
    ===================================================== */

    {

        id: "cost-001",

        category: "Cost Optimization",

        difficulty: "MEDIUM",

        question:
            "長期間安定して使用するEC2インスタンスのコストを削減したい場合、適切な選択肢はどれですか？",

        choices: [

            "Savings Plans",

            "NAT Gatewayを増やす",

            "CloudFrontを停止",

            "IAMユーザーを増やす"

        ],

        answer: 0,

        explanation:
            "Savings Plansは一定の利用量をコミットすることで、オンデマンド料金より低い料金を利用できます。",

        choiceExplanations: [

            "正解です。長期的なコンピューティング利用に適しています。",

            "コスト削減にはなりません。",

            "CDN停止とは関係ありません。",

            "IAMユーザー数とEC2料金は直接関係しません。"

        ]

    },


    {

        id: "cost-002",

        category: "Cost Optimization",

        difficulty: "HARD",

        question:
            "アクセス頻度が非常に低く、数年間保存する必要があるデータのストレージコストを最小化したい場合、適切な選択肢はどれですか？",

        choices: [

            "S3 Standard",

            "S3 Glacier Deep Archive",

            "EBS General Purpose",

            "EFS"

        ],

        answer: 1,

        explanation:
            "S3 Glacier Deep Archiveは長期保存・低頻度アクセス向けの非常に低コストなストレージクラスです。",

        choiceExplanations: [

            "頻繁なアクセス向けです。",

            "正解です。長期アーカイブ向けです。",

            "EC2向けブロックストレージです。",

            "ファイルストレージです。"

        ]

    }

];



/* =========================================================
   UTILITY
========================================================= */


function $(id) {

    return document.getElementById(id);

}


function calculateAccuracy(
    correct,
    total
) {

    if (!total) {

        return 0;

    }

    return Math.round(
        (correct / total) * 100
    );

}


function getTodayStart() {

    const date = new Date();

    date.setHours(
        0,
        0,
        0,
        0
    );

    return date;

}


function getWeekStart() {

    const date = new Date();

    const day = date.getDay();

    const diff =
        day === 0
            ? 6
            : day - 1;

    date.setDate(
        date.getDate() - diff
    );

    date.setHours(
        0,
        0,
        0,
        0
    );

    return date;

}


function formatDate(dateString) {

    if (!dateString) {

        return "—";

    }

    const date =
        new Date(dateString);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "—";

    }

    return date
        .toLocaleDateString(
            "ja-JP",
            {
                year: "numeric",
                month: "2-digit",
                day: "2-digit"
            }
        );

}


function getQuestionById(id) {

    return questionDatabase.find(
        question =>
            question.id === id
    );

}


/* =========================================================
   FIRESTORE REFERENCES
========================================================= */


function getProgressRef() {

    return doc(
        db,
        "users",
        currentUser.uid,
        "aws",
        "progress"
    );

}


function getHistoryCollection() {

    return collection(
        db,
        "users",
        currentUser.uid,
        "awsHistory"
    );

}


function getFavoritesCollection() {

    return collection(
        db,
        "users",
        currentUser.uid,
        "awsFavorites"
    );

}


/* =========================================================
   LOAD PROGRESS
========================================================= */


async function loadAwsData() {

    if (!currentUser) {

        return;

    }


    try {

        const snapshot =
            await getDoc(
                getProgressRef()
            );


        if (
            snapshot.exists()
        ) {

            const data =
                snapshot.data();


            awsData = {

                ...awsData,

                ...data

            };

        }


        applyAwsDataToUI();


    } catch (error) {

        console.error(
            "AWS data load error:",
            error
        );

    }

}



/* =========================================================
   SAVE PROGRESS
========================================================= */


async function saveAwsData() {

    if (!currentUser) {

        return false;

    }


    try {

        await setDoc(

            getProgressRef(),

            {

                progress:
                    Number(
                        awsData.progress
                    ),

                accuracy:
                    Number(
                        awsData.accuracy
                    ),

                questionCount:
                    Number(
                        awsData.questionCount
                    ),

                correctCount:
                    Number(
                        awsData.correctCount
                    ),

                incorrectCount:
                    Number(
                        awsData.incorrectCount
                    ),

                targetDate:
                    awsData.targetDate || "",

                targetQuestions:
                    Number(
                        awsData.targetQuestions || 0
                    ),

                dailyTarget:
                    Number(
                        awsData.dailyTarget || 0
                    ),

                note:
                    awsData.note || ""

            },

            {

                merge: true

            }

        );


        return true;


    } catch (error) {

        console.error(
            "AWS data save error:",
            error
        );

        return false;

    }

}



/* =========================================================
   APPLY DATA TO UI
========================================================= */


function applyAwsDataToUI() {

    const progress =
        Number(
            awsData.progress || 0
        );


    const accuracy =
        Number(
            awsData.accuracy || 0
        );


    $("aws-progress-value").textContent =
        `${progress}%`;


    $("aws-progress-text").textContent =
        `${progress}%`;


    $("aws-progress-bar").style.width =
        `${Math.min(progress, 100)}%`;


    $("aws-accuracy-value").textContent =
        `${accuracy}%`;


    $("aws-question-count").textContent =
        awsData.questionCount || 0;


    $("aws-target-date").value =
        awsData.targetDate || "";


    $("aws-progress-input").value =
        progress;


    $("aws-target-questions-input").value =
        awsData.targetQuestions || 1000;


    $("aws-daily-target-input").value =
        awsData.dailyTarget || 10;


    $("aws-note").value =
        awsData.note || "";


    updateGoalUI();

}



/* =========================================================
   SETTINGS
========================================================= */


async function saveSettings() {

    if (!currentUser) {

        alert(
            "Firebase認証を確認しています。"
        );

        return;

    }


    const progress =
        Number(
            $("aws-progress-input").value
        );


    const targetQuestions =
        Number(
            $("aws-target-questions-input").value
        );


    const dailyTarget =
        Number(
            $("aws-daily-target-input").value
        );


    if (
        progress < 0 ||
        progress > 100
    ) {

        alert(
            "進捗率は0〜100で入力してください。"
        );

        return;

    }


    awsData.progress =
        progress;


    awsData.targetDate =
        $("aws-target-date").value;


    awsData.targetQuestions =
        targetQuestions;


    awsData.dailyTarget =
        dailyTarget;


    awsData.note =
        $("aws-note").value.trim();


    const success =
        await saveAwsData();


    if (success) {

        $("aws-save-status").textContent =
            "保存しました。";


        applyAwsDataToUI();


        setTimeout(
            () => {

                $("aws-save-status").textContent =
                    "";

            },
            2500
        );

    }

}



/* =========================================================
   LOAD HISTORY
========================================================= */


async function loadHistory() {

    if (!currentUser) {

        return;

    }


    try {

        const snapshot =
            await getDocs(
                getHistoryCollection()
            );


        questionHistory = [];


        snapshot.forEach(
            docSnapshot => {

                const data =
                    docSnapshot.data();


                questionHistory.push({

                    id:
                        docSnapshot.id,

                    ...data

                });

            }
        );


        questionHistory.sort(
            (
                a,
                b
            ) => {

                const aTime =
                    a.answeredAt?.toMillis
                        ? a.answeredAt.toMillis()
                        : 0;

                const bTime =
                    b.answeredAt?.toMillis
                        ? b.answeredAt.toMillis()
                        : 0;

                return bTime - aTime;

            }
        );


        updateAnalytics();


    } catch (error) {

        console.error(
            "History load error:",
            error
        );

    }

}



/* =========================================================
   LOAD FAVORITES
========================================================= */


async function loadFavorites() {

    if (!currentUser) {

        return;

    }


    try {

        const snapshot =
            await getDocs(
                getFavoritesCollection()
            );


        favoriteQuestionIds =
            new Set();


        snapshot.forEach(
            item => {

                favoriteQuestionIds.add(
                    item.id
                );

            }
        );


    } catch (error) {

        console.error(
            "Favorites load error:",
            error
        );

    }

}



/* =========================================================
   SAVE HISTORY
========================================================= */


async function saveAnswerHistory(
    question,
    selectedIndex,
    isCorrect
) {

    if (!currentUser) {

        return;

    }


    try {

        await addDoc(

            getHistoryCollection(),

            {

                questionId:
                    question.id,

                category:
                    question.category,

                difficulty:
                    question.difficulty,

                selectedIndex:
                    selectedIndex,

                correctIndex:
                    question.answer,

                isCorrect:
                    isCorrect,

                answeredAt:
                    Timestamp.now()

            }

        );


    } catch (error) {

        console.error(
            "History save error:",
            error
        );

    }

}



/* =========================================================
   FAVORITE
========================================================= */


async function toggleFavorite() {

    if (
        !currentUser ||
        !currentQuestion
    ) {

        return;

    }


    const questionId =
        currentQuestion.id;


    const favoriteRef =
        doc(
            db,
            "users",
            currentUser.uid,
            "awsFavorites",
            questionId
        );


    try {

        if (
            favoriteQuestionIds.has(
                questionId
            )
        ) {

            await deleteDoc(
                favoriteRef
            );


            favoriteQuestionIds.delete(
                questionId
            );

        } else {

            await setDoc(

                favoriteRef,

                {

                    questionId:
                        questionId,

                    category:
                        currentQuestion.category,

                    createdAt:
                        Timestamp.now()

                }

            );


            favoriteQuestionIds.add(
                questionId
            );

        }


        updateFavoriteButton();


    } catch (error) {

        console.error(
            "Favorite error:",
            error
        );

    }

}



/* =========================================================
   FAVORITE BUTTON
========================================================= */


function updateFavoriteButton() {

    if (
        !currentQuestion
    ) {

        $("favorite-button").disabled =
            true;

        return;

    }


    $("favorite-button").disabled =
        false;


    const isFavorite =
        favoriteQuestionIds.has(
            currentQuestion.id
        );


    $("favorite-button").textContent =
        isFavorite
            ? "★ お気に入り済み"
            : "☆ お気に入り";

}



/* =========================================================
   UPDATE ANALYTICS
========================================================= */


function updateAnalytics() {

    updateDailyWeekly();

    updateCategoryPerformance();

    updateWeakAreas();

    updateStreak();

    updateGoalUI();

}



/* =========================================================
   DAILY / WEEKLY
========================================================= */


function updateDailyWeekly() {

    const todayStart =
        getTodayStart()
            .getTime();


    const weekStart =
        getWeekStart()
            .getTime();


    const today =
        questionHistory.filter(
            item => {

                const time =
                    item.answeredAt?.toMillis
                        ? item.answeredAt.toMillis()
                        : 0;

                return time >= todayStart;

            }
        );


    const week =
        questionHistory.filter(
            item => {

                const time =
                    item.answeredAt?.toMillis
                        ? item.answeredAt.toMillis()
                        : 0;

                return time >= weekStart;

            }
        );


    const todayCorrect =
        today.filter(
            item =>
                item.isCorrect
        ).length;


    const weekCorrect =
        week.filter(
            item =>
                item.isCorrect
        ).length;


    $("today-question-count").textContent =
        today.length;


    $("today-accuracy").textContent =
        `${calculateAccuracy(
            todayCorrect,
            today.length
        )}%`;


    $("week-question-count").textContent =
        week.length;


    $("week-accuracy").textContent =
        `${calculateAccuracy(
            weekCorrect,
            week.length
        )}%`;

}



/* =========================================================
   CATEGORY PERFORMANCE
========================================================= */


function updateCategoryPerformance() {

    const container =
        $("category-performance");


    container.innerHTML =
        "";


    categories.forEach(
        category => {

            const records =
                questionHistory.filter(
                    item =>
                        item.category ===
                        category
                );


            const correct =
                records.filter(
                    item =>
                        item.isCorrect
                ).length;


            const accuracy =
                calculateAccuracy(
                    correct,
                    records.length
                );


            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "category-row";


            row.innerHTML = `

                <div class="category-header">

                    <span class="category-name">
                        ${category}
                    </span>

                    <span class="category-score">
                        ${records.length
                            ? accuracy + "%"
                            : "—"}
                    </span>

                </div>


                <div class="category-background">

                    <div
                        class="category-bar"
                        style="width:${accuracy}%"
                    ></div>

                </div>


                <div class="category-meta">

                    ${records.length}
                    問 / ${correct}
                    問正解

                </div>

            `;


            container.appendChild(
                row
            );

        }
    );

}



/* =========================================================
   WEAK AREAS
========================================================= */


function updateWeakAreas() {

    const container =
        $("weak-areas");


    container.innerHTML =
        "";


    const weakCategories =
        [];


    categories.forEach(
        category => {

            const records =
                questionHistory.filter(
                    item =>
                        item.category ===
                        category
                );


            if (
                records.length < 3
            ) {

                return;

            }


            const correct =
                records.filter(
                    item =>
                        item.isCorrect
                ).length;


            const accuracy =
                calculateAccuracy(
                    correct,
                    records.length
                );


            if (
                accuracy < 60
            ) {

                weakCategories.push({

                    category:
                        category,

                    accuracy:
                        accuracy

                });

            }

        }
    );


    weakCategories.sort(
        (
            a,
            b
        ) =>
            a.accuracy -
            b.accuracy
    );


    if (
        weakCategories.length === 0
    ) {

        container.innerHTML = `

            <div class="good-message">

                現在、明確な弱点分野はありません。<br>

                この調子で学習を続けましょう。

            </div>

        `;

        return;

    }


    weakCategories.forEach(
        item => {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "weak-item";


            row.innerHTML = `

                <span class="weak-name">
                    ⚠ ${item.category}
                </span>

                <span class="weak-score">
                    ${item.accuracy}%
                </span>

            `;


            container.appendChild(
                row
            );

        }
    );

}



/* =========================================================
   STREAK
========================================================= */


function updateStreak() {

    const dateSet =
        new Set();


    questionHistory.forEach(
        item => {

            if (
                !item.answeredAt?.toDate
            ) {

                return;

            }


            const date =
                item.answeredAt.toDate();


            const key =
                date.toLocaleDateString(
                    "ja-JP"
                );


            dateSet.add(
                key
            );

        }
    );


    let currentStreak = 0;

    const currentDate =
        new Date();


    currentDate.setHours(
        0,
        0,
        0,
        0
    );


    while (true) {

        const key =
            currentDate.toLocaleDateString(
                "ja-JP"
            );


        if (
            dateSet.has(key)
        ) {

            currentStreak++;

            currentDate.setDate(
                currentDate.getDate() - 1
            );

        } else {

            break;

        }

    }


    let longestStreak = 0;

    let tempStreak = 0;

    const sortedDates =
        Array.from(
            dateSet
        )
        .map(
            value =>
                new Date(value)
        )
        .sort(
            (
                a,
                b
            ) =>
                a - b
        );


    let previousDate =
        null;


    sortedDates.forEach(
        date => {

            if (!previousDate) {

                tempStreak = 1;

            } else {

                const diff =
                    (
                        date -
                        previousDate
                    ) /
                    (
                        1000 *
                        60 *
                        60 *
                        24
                    );


                if (
                    diff === 1
                ) {

                    tempStreak++;

                } else {

                    tempStreak = 1;

                }

            }


            longestStreak =
                Math.max(
                    longestStreak,
                    tempStreak
                );


            previousDate =
                date;

        }
    );


    $("streak-count").textContent =
        currentStreak;


    $("longest-streak").textContent =
        `最長記録 ${longestStreak}日`;


    renderStreakCalendar(
        dateSet
    );

}



/* =========================================================
   STREAK CALENDAR
========================================================= */


function renderStreakCalendar(
    dateSet
) {

    const container =
        $("streak-calendar");


    container.innerHTML =
        "";


    for (
        let i = 27;
        i >= 0;
        i--
    ) {

        const date =
            new Date();


        date.setHours(
            0,
            0,
            0,
            0
        );


        date.setDate(
            date.getDate() - i
        );


        const key =
            date.toLocaleDateString(
                "ja-JP"
            );


        const box =
            document.createElement(
                "div"
            );


        box.className =
            "streak-day";


        if (
            dateSet.has(key)
        ) {

            box.classList.add(
                "active"
            );

        }


        box.title =
            key;


        container.appendChild(
            box
        );

    }

}



/* =========================================================
   GOAL
========================================================= */


function updateGoalUI() {

    const targetDate =
        awsData.targetDate;


    $("goal-target-date").textContent =
        formatDate(
            targetDate
        );


    const targetQuestions =
        Number(
            awsData.targetQuestions || 0
        );


    $("goal-target-questions").textContent =
        targetQuestions;


    const dailyTarget =
        Number(
            awsData.dailyTarget || 0
        );


    $("goal-today-target").textContent =
        dailyTarget;


    if (!targetDate) {

        $("goal-days-left").textContent =
            "—";

        return;

    }


    const today =
        new Date();


    today.setHours(
        0,
        0,
        0,
        0
    );


    const target =
        new Date(
            targetDate
        );


    target.setHours(
        0,
        0,
        0,
        0
    );


    const diff =
        Math.ceil(
            (
                target -
                today
            ) /
            (
                1000 *
                60 *
                60 *
                24
            )
        );


    $("goal-days-left").textContent =
        diff >= 0
            ? `${diff}日`
            : "期限超過";

}



/* =========================================================
   QUESTION SELECTION
========================================================= */


function getFilteredQuestions() {

    let list =
        [...questionDatabase];


    if (
        currentFilter === "weak"
    ) {

        const weakCategories =
            new Set();


        categories.forEach(
            category => {

                const records =
                    questionHistory.filter(
                        item =>
                            item.category ===
                            category
                    );


                if (
                    records.length >= 3
                ) {

                    const correct =
                        records.filter(
                            item =>
                                item.isCorrect
                        ).length;


                    const accuracy =
                        calculateAccuracy(
                            correct,
                            records.length
                        );


                    if (
                        accuracy < 60
                    ) {

                        weakCategories.add(
                            category
                        );

                    }

                }

            }
        );


        list =
            list.filter(
                question =>
                    weakCategories.has(
                        question.category
                    )
            );

    }


    if (
        currentFilter === "wrong"
    ) {

        list =
            list.filter(
                question =>
                    wrongQuestionIds.has(
                        question.id
                    )
            );

    }


    return list;

}



/* =========================================================
   GET RANDOM QUESTION
========================================================= */


function getRandomQuestion(
    pool
) {

    if (
        !pool.length
    ) {

        return null;

    }


    if (
        pool.length === 1
    ) {

        return pool[0];

    }


    let question;


    do {

        const index =
            Math.floor(
                Math.random() *
                pool.length
            );


        question =
            pool[index];

    } while (
        question.id ===
        previousQuestionId
    );


    previousQuestionId =
        question.id;


    return question;

}



/* =========================================================
   START STUDY
========================================================= */


function startStudy() {

    stopMockExam();


    studyMode =
        currentFilter;


    currentStudyQuestions =
        getFilteredQuestions();


    if (
        !currentStudyQuestions.length
    ) {

        alert(
            "現在、この条件で利用できる問題がありません。"
        );

        return;

    }


    currentStudyIndex = 0;


    renderQuestion();


    $("study-section")
        .scrollIntoView({
            behavior: "smooth"
        });

}



/* =========================================================
   RENDER QUESTION
========================================================= */


function renderQuestion() {

    const pool =
        currentStudyQuestions.length
            ? currentStudyQuestions
            : questionDatabase;


    currentQuestion =
        getRandomQuestion(
            pool
        );


    if (
        !currentQuestion
    ) {

        return;

    }


    $("question-number").textContent =
        `QUESTION ${
            awsData.questionCount + 1
        }`;


    $("question-text").textContent =
        currentQuestion.question;


    $("question-tags").innerHTML = `

        <span class="question-tag">
            ${currentQuestion.category}
        </span>

        <span class="question-tag">
            ${currentQuestion.difficulty}
        </span>

    `;


    const answerList =
        $("answer-list");


    answerList.innerHTML =
        "";


    $("question-result").style.display =
        "none";


    $("question-result").textContent =
        "";


    $("next-question-button").style.display =
        "none";


    updateFavoriteButton();


    currentQuestion.choices.forEach(
        (
            choice,
            index
        ) => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "answer-button";


            button.textContent =
                `${String.fromCharCode(
                    65 + index
                )}. ${choice}`;


            button.addEventListener(
                "click",
                () => {

                    answerQuestion(
                        index
                    );

                }
            );


            answerList.appendChild(
                button
            );

        }
    );

}



/* =========================================================
   ANSWER QUESTION
========================================================= */


async function answerQuestion(
    selectedIndex
) {

    if (
        !currentQuestion
    ) {

        return;

    }


    const buttons =
        Array.from(
            document.querySelectorAll(
                ".answer-button"
            )
        );


    buttons.forEach(
        button => {

            button.disabled =
                true;

        }
    );


    const correctIndex =
        currentQuestion.answer;


    const isCorrect =
        selectedIndex ===
        correctIndex;


    if (
        buttons[selectedIndex]
    ) {

        buttons[selectedIndex]
            .classList.add(
                isCorrect
                    ? "correct"
                    : "incorrect"
            );

    }


    if (
        buttons[correctIndex]
    ) {

        buttons[correctIndex]
            .classList.add(
                "correct"
            );

    }


    awsData.questionCount++;


    if (isCorrect) {

        awsData.correctCount++;

    } else {

        awsData.incorrectCount++;

        wrongQuestionIds.add(
            currentQuestion.id
        );

    }


    awsData.accuracy =
        calculateAccuracy(
            awsData.correctCount,
            awsData.questionCount
        );


    await saveAnswerHistory(

        currentQuestion,

        selectedIndex,

        isCorrect

    );


    await saveAwsData();


    const result =
        $("question-result");


    let resultText =
        isCorrect
            ? "正解です！"
            : "不正解です。";


    resultText +=
        `\n\n正解：${
            String.fromCharCode(
                65 +
                correctIndex
            )
        }. ${
            currentQuestion.choices[
                correctIndex
            ]
        }`;


    resultText +=
        `\n\n【解説】\n${
            currentQuestion.explanation
        }`;


    resultText +=
        "\n\n【各選択肢のポイント】";


    currentQuestion.choiceExplanations
        .forEach(
            (
                explanation,
                index
            ) => {

                resultText +=
                    `\n${
                        String.fromCharCode(
                            65 + index
                        )
                    }. ${
                        explanation
                    }`;

            }
        );


    result.textContent =
        resultText;


    result.style.display =
        "block";


    $("next-question-button").style.display =
        "inline-flex";


    applyAwsDataToUI();


    updateAnalytics();

}



/* =========================================================
   NEXT QUESTION
========================================================= */


function nextQuestion() {

    if (
        studyMode === "wrong"
    ) {

        currentStudyQuestions =
            getFilteredQuestions();

    }


    renderQuestion();

}



/* =========================================================
   FILTER BUTTONS
========================================================= */


function setupFilters() {

    const buttons =
        document.querySelectorAll(
            ".filter-button"
        );


    buttons.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    buttons.forEach(
                        item =>
                            item.classList.remove(
                                "active"
                            )
                    );


                    button.classList.add(
                        "active"
                    );


                    currentFilter =
                        button.dataset.filter;

                }
            );

        }
    );

}



/* =========================================================
   REBUILD WRONG QUESTION IDS
========================================================= */


function rebuildWrongQuestions() {

    wrongQuestionIds =
        new Set();


    const latestByQuestion =
        new Map();


    questionHistory.forEach(
        item => {

            if (
                !item.questionId
            ) {

                return;

            }


            if (
                !latestByQuestion.has(
                    item.questionId
                )
            ) {

                latestByQuestion.set(
                    item.questionId,
                    item
                );

            }

        }
    );


    latestByQuestion.forEach(
        (
            item,
            questionId
        ) => {

            if (
                !item.isCorrect
            ) {

                wrongQuestionIds.add(
                    questionId
                );

            }

        }
    );

}



/* =========================================================
   MOCK EXAM
========================================================= */


function createMockQuestions() {

    const shuffled =
        [...questionDatabase]
        .sort(
            () =>
                Math.random() - 0.5
        );


    const result = [];


    for (
        let i = 0;
        i < MOCK_TOTAL;
        i++
    ) {

        result.push(
            shuffled[
                i %
                shuffled.length
            ]
        );

    }


    return result;

}



/* =========================================================
   START MOCK
========================================================= */


function startMockExam() {

    currentQuestion =
        null;


    mockQuestions =
        createMockQuestions();


    mockAnswers =
        Array(
            MOCK_TOTAL
        ).fill(null);


    mockMarked =
        Array(
            MOCK_TOTAL
        ).fill(false);


    mockCurrentIndex =
        0;


    mockStartedAt =
        Date.now();


    studyMode =
        "mock";


    $("study-section")
        .scrollIntoView({
            behavior: "smooth"
        });


    renderMockQuestion();

    startMockTimer();

}



/* =========================================================
   RENDER MOCK
========================================================= */


function renderMockQuestion() {

    const question =
        mockQuestions[
            mockCurrentIndex
        ];


    currentQuestion =
        question;


    $("question-number").textContent =
        `MOCK QUESTION ${
            mockCurrentIndex + 1
        } / ${
            MOCK_TOTAL
        }`;


    $("question-text").textContent =
        question.question;


    $("question-tags").innerHTML = `

        <span class="question-tag">
            ${question.category}
        </span>

        <span class="question-tag">
            ${question.difficulty}
        </span>

    `;


    const answerList =
        $("answer-list");


    answerList.innerHTML =
        "";


    question.choices.forEach(
        (
            choice,
            index
        ) => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "answer-button";


            button.textContent =
                `${String.fromCharCode(
                    65 + index
                )}. ${choice}`;


            if (
                mockAnswers[
                    mockCurrentIndex
                ] === index
            ) {

                button.classList.add(
                    "correct"
                );

            }


            button.addEventListener(
                "click",
                () => {

                    selectMockAnswer(
                        index
                    );

                }
            );


            answerList.appendChild(
                button
            );

        }
    );


    $("question-result").style.display =
        "none";


    $("favorite-button").style.display =
        "none";


    $("next-question-button").style.display =
        "none";


    renderMockNavigation();

}



/* =========================================================
   MOCK ANSWER
========================================================= */


function selectMockAnswer(
    index
) {

    mockAnswers[
        mockCurrentIndex
    ] =
        index;


    renderMockQuestion();

}



/* =========================================================
   MOCK NAVIGATION
========================================================= */


function renderMockNavigation() {

    let existing =
        document.getElementById(
            "mock-navigation"
        );


    if (!existing) {

        existing =
            document.createElement(
                "div"
            );


        existing.id =
            "mock-navigation";


        existing.className =
            "mock-navigation";


        $("question-container")
            .appendChild(
                existing
            );

    }


    existing.innerHTML =
        "";


    mockQuestions.forEach(
        (
            question,
            index
        ) => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "mock-nav-button";


            button.textContent =
                index + 1;


            if (
                index ===
                mockCurrentIndex
            ) {

                button.classList.add(
                    "current"
                );

            }


            if (
                mockAnswers[index] !==
                null
            ) {

                button.classList.add(
                    "answered"
                );

            }


            if (
                mockMarked[index]
            ) {

                button.classList.add(
                    "marked"
                );

            }


            button.addEventListener(
                "click",
                () => {

                    mockCurrentIndex =
                        index;

                    renderMockQuestion();

                }
            );


            existing.appendChild(
                button
            );

        }
    );


    const actions =
        document.createElement(
            "div"
        );


    actions.className =
        "button-row";


    actions.style.marginTop =
        "15px";


    const previous =
        document.createElement(
            "button"
        );


    previous.type =
        "button";


    previous.className =
        "aws-button secondary";


    previous.textContent =
        "← 前へ";


    previous.disabled =
        mockCurrentIndex === 0;


    previous.addEventListener(
        "click",
        () => {

            mockCurrentIndex--;

            renderMockQuestion();

        }
    );


    const mark =
        document.createElement(
            "button"
        );


    mark.type =
        "button";


    mark.className =
        "aws-button secondary";


    mark.textContent =
        mockMarked[
            mockCurrentIndex
        ]
            ? "★ 見直し解除"
            : "☆ 見直し";


    mark.addEventListener(
        "click",
        () => {

            mockMarked[
                mockCurrentIndex
            ] =
                !mockMarked[
                    mockCurrentIndex
                ];

            renderMockQuestion();

        }
    );


    const next =
        document.createElement(
            "button"
        );


    next.type =
        "button";


    next.className =
        "aws-button";


    next.textContent =
        mockCurrentIndex ===
        MOCK_TOTAL - 1
            ? "試験終了"
            : "次へ →";


    next.addEventListener(
        "click",
        () => {

            if (
                mockCurrentIndex ===
                MOCK_TOTAL - 1
            ) {

                finishMockExam();

            } else {

                mockCurrentIndex++;

                renderMockQuestion();

            }

        }
    );


    actions.appendChild(
        previous
    );


    actions.appendChild(
        mark
    );


    actions.appendChild(
        next
    );


    existing.appendChild(
        actions
    );

}



/* =========================================================
   MOCK TIMER
========================================================= */


function startMockTimer() {

    clearInterval(
        mockTimerInterval
    );


    const oldTimer =
        document.getElementById(
            "mock-timer"
        );


    if (oldTimer) {

        oldTimer.remove();

    }


    const timer =
        document.createElement(
            "div"
        );


    timer.id =
        "mock-timer";


    timer.className =
        "mock-timer";


    $("question-container")
        .prepend(
            timer
        );


    updateMockTimer();


    mockTimerInterval =
        setInterval(
            updateMockTimer,
            1000
        );

}



/* =========================================================
   UPDATE TIMER
========================================================= */


function updateMockTimer() {

    if (
        !mockStartedAt
    ) {

        return;

    }


    const elapsed =
        Math.floor(
            (
                Date.now() -
                mockStartedAt
            ) /
            1000
        );


    const remaining =
        Math.max(
            0,
            MOCK_TIME_SECONDS -
            elapsed
        );


    const hours =
        Math.floor(
            remaining / 3600
        );


    const minutes =
        Math.floor(
            (
                remaining % 3600
            ) /
            60
        );


    const seconds =
        remaining %
        60;


    const timer =
        $("mock-timer");


    if (
        timer
    ) {

        timer.textContent =
            `TIME ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    }


    if (
        remaining === 0
    ) {

        finishMockExam();

    }

}



/* =========================================================
   FINISH MOCK
========================================================= */


async function finishMockExam() {

    clearInterval(
        mockTimerInterval
    );


    mockTimerInterval =
        null;


    let correct = 0;


    mockQuestions.forEach(
        (
            question,
            index
        ) => {

            if (
                mockAnswers[index] ===
                question.answer
            ) {

                correct++;

            }

        }
    );


    const score =
        calculateAccuracy(
            correct,
            MOCK_TOTAL
        );


    const elapsed =
        Math.floor(
            (
                Date.now() -
                mockStartedAt
            ) /
            1000
        );


    const minutes =
        Math.floor(
            elapsed / 60
        );


    const seconds =
        elapsed %
        60;


    const timeText =
        `${minutes}分${seconds}秒`;


    let estimate;


    if (
        score >= 75
    ) {

        estimate =
            "PASS";

    } else if (
        score >= 65
    ) {

        estimate =
            "BORDERLINE";

    } else {

        estimate =
            "REVIEW";

    }


    if (
        currentUser
    ) {

        try {

            await addDoc(

                collection(
                    db,
                    "users",
                    currentUser.uid,
                    "awsMockResults"
                ),

                {

                    correct:
                        correct,

                    total:
                        MOCK_TOTAL,

                    score:
                        score,

                    elapsedSeconds:
                        elapsed,

                    estimate:
                        estimate,

                    answeredAt:
                        Timestamp.now()

                }

            );

        } catch (error) {

            console.error(
                "Mock result save error:",
                error
            );

        }

    }


    $("mock-result-score").textContent =
        `${score}%`;


    $("mock-result-correct").textContent =
        correct;


    $("mock-result-total").textContent =
        MOCK_TOTAL;


    $("mock-result-time").textContent =
        timeText;


    $("mock-result-estimate").textContent =
        estimate;


    $("mock-result-modal")
        .classList.add(
            "active"
        );


    studyMode =
        "normal";


    mockStartedAt =
        null;


    $("favorite-button").style.display =
        "inline-flex";

}



/* =========================================================
   STOP MOCK
========================================================= */


function stopMockExam() {

    clearInterval(
        mockTimerInterval
    );


    mockTimerInterval =
        null;


    mockStartedAt =
        null;


    const timer =
        $("mock-timer");


    if (
        timer
    ) {

        timer.remove();

    }


    const navigation =
        $("mock-navigation");


    if (
        navigation
    ) {

        navigation.remove();

    }


    $("favorite-button").style.display =
        "inline-flex";

}



/* =========================================================
   AUTH
========================================================= */


function setupAuth() {

    onAuthStateChangedAuth(

        auth,

        async user => {

            currentUser =
                user;


            if (!user) {

                $("auth-status").textContent =
                    "OFFLINE";

                return;

            }


            $("auth-status").textContent =
                "CONNECTED";


            await loadAwsData();

            await loadHistory();

            await loadFavorites();


            rebuildWrongQuestions();

            updateAnalytics();

        }

    );

}



/* =========================================================
   EVENT LISTENERS
========================================================= */


function setupEventListeners() {


    $("aws-save-button")
        .addEventListener(
            "click",
            saveSettings
        );


    $("favorite-button")
        .addEventListener(
            "click",
            toggleFavorite
        );


    $("next-question-button")
        .addEventListener(
            "click",
            nextQuestion
        );


    $("start-study-button")
        .addEventListener(
            "click",
            startStudy
        );


    $("start-mock-button")
        .addEventListener(
            "click",
            startMockExam
        );


    $("start-review-button")
        .addEventListener(
            "click",
            () => {

                currentFilter =
                    "wrong";


                document
                    .querySelectorAll(
                        ".filter-button"
                    )
                    .forEach(
                        button => {

                            button.classList.toggle(

                                "active",

                                button.dataset.filter ===
                                    "wrong"

                            );

                        }
                    );


                startStudy();

            }
        );


    $("close-mock-result")
        .addEventListener(
            "click",
            () => {

                $("mock-result-modal")
                    .classList.remove(
                        "active"
                    );

            }
        );


    $("mock-result-modal")
        .addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    $("mock-result-modal")
                ) {

                    $("mock-result-modal")
                        .classList.remove(
                            "active"
                        );

                }

            }
        );


    setupFilters();

}



/* =========================================================
   INITIALIZE
========================================================= */


function initialize() {

    setupEventListeners();

    setupAuth();


    /* Initial dashboard values */

    updateAnalytics();


    /* Initial question */

    currentStudyQuestions =
        [...questionDatabase];


    renderQuestion();

}


initialize();
