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
    Timestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
    onAuthStateChanged as onAuthStateChangedAuth
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    db,
    auth
} from "./firebase.js";


// =========================================================
// GLOBAL STATE
// =========================================================

let currentUser = null;

let currentQuestion = null;
let previousQuestionId = null;

let currentFilter = "all";

let favoriteQuestionIds = new Set();
let wrongQuestionIds = new Set();

let questionHistory = [];

let currentStudyQuestions = [];
let currentStudyIndex = 0;

let studyMode = "normal";


// =========================================================
// MOCK EXAM STATE
// =========================================================

let mockQuestions = [];
let mockAnswers = [];
let mockMarked = [];

let mockCurrentIndex = 0;

let mockStartedAt = null;
let mockTimerInterval = null;

const MOCK_TOTAL = 65;
const MOCK_TIME_SECONDS = 120 * 60;


// =========================================================
// AWS DATA
// =========================================================

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


// =========================================================
// CATEGORY
// =========================================================

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


// =========================================================
// QUESTION DATABASE
// =========================================================

const questionDatabase = [

    {
        id: "q001",

        category: "IAM / Security",

        difficulty: "標準",

        question:
            "AWSアカウント内のユーザーに対して、AWSリソースへのアクセス権限を管理するために使用するサービスはどれですか？",

        choices: [
            "Amazon CloudWatch",
            "AWS IAM",
            "Amazon GuardDuty",
            "AWS CloudTrail"
        ],

        answer: 1,

        explanation:
            "AWS IAMは、AWSリソースへのアクセスを安全に管理するためのサービスです。ユーザー、グループ、ロール、ポリシーなどを管理できます。",

        choiceExplanations: [

            "CloudWatchは監視・メトリクス・ログなどを扱うサービスです。",

            "正解です。IAMはAWSリソースへのアクセス権限を管理します。",

            "GuardDutyは脅威検知サービスです。",

            "CloudTrailはAPI操作などの監査ログを記録するサービスです。"

        ]
    },


    {
        id: "q002",

        category: "IAM / Security",

        difficulty: "標準",

        question:
            "EC2インスタンスからS3バケットへアクセスさせたい。アクセスキーをEC2に保存せずにアクセスを許可する最適な方法はどれですか？",

        choices: [
            "IAMロールをEC2に関連付ける",
            "IAMユーザーのアクセスキーをEC2に保存する",
            "S3バケットをパブリック公開する",
            "ルートユーザーの認証情報を設定する"
        ],

        answer: 0,

        explanation:
            "EC2からAWSサービスへアクセスさせる場合は、IAMロールをEC2インスタンスプロファイルとして関連付けるのが推奨されます。長期間有効なアクセスキーを保存する必要がありません。",

        choiceExplanations: [

            "正解です。IAMロールを使用すると一時的な認証情報を利用できます。",

            "アクセスキーをサーバーへ保存する方法は、認証情報漏えいのリスクがあります。",

            "S3をパブリック公開する必要はありません。",

            "ルートユーザーの認証情報を使用するのは不適切です。"

        ]
    },


    {
        id: "q003",

        category: "IAM / Security",

        difficulty: "やや難",

        question:
            "複数のAWSアカウントを組織として管理し、アカウント単位で利用可能なAWSサービスを制限したい。適切な機能はどれですか？",

        choices: [
            "IAMポリシー",
            "Security Group",
            "Service Control Policies（SCP）",
            "Network ACL"
        ],

        answer: 2,

        explanation:
            "AWS OrganizationsのSCPを使用すると、組織内のAWSアカウントに対して利用可能なサービスや操作の最大権限を制御できます。",

        choiceExplanations: [

            "IAMポリシーはユーザーやロールなどの権限を制御します。",

            "Security Groupはネットワーク通信を制御します。",

            "正解です。SCPはAWS Organizationsでアカウントの最大権限を制御します。",

            "Network ACLはサブネットレベルのネットワークアクセス制御です。"

        ]
    },


    {
        id: "q004",

        category: "VPC / Networking",

        difficulty: "標準",

        question:
            "VPC内のプライベートサブネットに配置されたEC2インスタンスから、インターネット上のサービスへアクセスさせたい。最も一般的な構成はどれですか？",

        choices: [
            "Internet Gatewayのみを使用する",
            "NAT Gatewayをパブリックサブネットに配置する",
            "EC2にElastic IPを付与する",
            "VPC Peeringを使用する"
        ],

        answer: 1,

        explanation:
            "プライベートサブネットから外部へ通信する場合、通常はパブリックサブネットにNAT Gatewayを配置し、プライベートサブネットのルートテーブルからNAT Gatewayへルーティングします。",

        choiceExplanations: [

            "プライベートサブネットからInternet Gatewayへ直接ルーティングする構成ではありません。",

            "正解です。NAT Gatewayを利用するとプライベートIPのまま外部へ通信できます。",

            "Elastic IPを付与するとパブリックアクセス可能な構成になり、目的に合いません。",

            "VPC PeeringはVPC間接続のための機能です。"

        ]
    },


    {
        id: "q005",

        category: "VPC / Networking",

        difficulty: "標準",

        question:
            "AWS上のVPCとオンプレミス環境を専用線で接続したい。最も適切なサービスはどれですか？",

        choices: [
            "AWS Direct Connect",
            "AWS Site-to-Site VPN",
            "VPC Peering",
            "NAT Gateway"
        ],

        answer: 0,

        explanation:
            "AWS Direct Connectはオンプレミス環境とAWSを専用のネットワーク接続で接続するサービスです。",

        choiceExplanations: [

            "正解です。Direct Connectは専用線接続を提供します。",

            "Site-to-Site VPNはインターネットを経由したVPN接続です。",

            "VPC PeeringはVPC同士を接続するための機能です。",

            "NAT Gatewayはプライベートサブネットから外部へ通信するための機能です。"

        ]
    },


    {
        id: "q006",

        category: "VPC / Networking",

        difficulty: "標準",

        question:
            "VPC内のEC2からS3へインターネットを経由せずにアクセスしたい。適切な方法はどれですか？",

        choices: [
            "Internet Gateway",
            "NAT Gateway",
            "VPC Endpoint",
            "Elastic IP"
        ],

        answer: 2,

        explanation:
            "VPC Endpointを利用すると、VPCからAWSサービスへインターネットを経由せずにアクセスできます。S3ではGateway Endpointが一般的です。",

        choiceExplanations: [

            "Internet Gatewayはインターネットとの通信に使用します。",

            "NAT Gatewayはプライベートサブネットからインターネットへアクセスするために使用します。",

            "正解です。VPC Endpointを使用するとAWSサービスへプライベートにアクセスできます。",

            "Elastic IPは固定パブリックIPv4アドレスです。"

        ]
    },


    {
        id: "q007",

        category: "VPC / Networking",

        difficulty: "やや難",

        question:
            "異なるVPCに存在するアプリケーション間でプライベート通信を行いたい。単純なVPC間接続として利用できる機能はどれですか？",

        choices: [
            "VPC Peering",
            "NAT Gateway",
            "Internet Gateway",
            "AWS WAF"
        ],

        answer: 0,

        explanation:
            "VPC Peeringを利用すると、異なるVPC間でプライベートIPアドレスを使用した通信が可能になります。",

        choiceExplanations: [

            "正解です。VPC PeeringはVPC間を直接接続します。",

            "NAT Gatewayは外部への通信に使用します。",

            "Internet Gatewayはインターネットとの接続に使用します。",

            "AWS WAFはWebアプリケーションの攻撃対策です。"

        ]
    },


    {
        id: "q008",

        category: "VPC / Networking",

        difficulty: "やや難",

        question:
            "複数のVPCから共通のサービスへ接続する必要があり、VPC Peeringの大量設定を避けたい。適切なサービスはどれですか？",

        choices: [
            "AWS Transit Gateway",
            "NAT Gateway",
            "Internet Gateway",
            "Amazon CloudFront"
        ],

        answer: 0,

        explanation:
            "AWS Transit Gatewayは複数のVPCやオンプレミスネットワークをハブ型で接続できます。大規模なネットワーク構成で有効です。",

        choiceExplanations: [

            "正解です。Transit Gatewayはネットワークのハブとして利用できます。",

            "NAT Gatewayは外部アクセス用です。",

            "Internet GatewayはVPCとインターネットを接続します。",

            "CloudFrontはCDNサービスです。"

        ]
    },


    {
        id: "q009",

        category: "EC2",

        difficulty: "標準",

        question:
            "EC2インスタンスへのOSパッチ適用を自動化・集中管理したい。適切なAWSサービスはどれですか？",

        choices: [
            "AWS Systems Manager",
            "Amazon Inspector",
            "AWS CloudTrail",
            "Amazon Route 53"
        ],

        answer: 0,

        explanation:
            "AWS Systems ManagerのPatch Managerなどを利用すると、EC2などのマネージドノードに対するパッチ管理を行えます。",

        choiceExplanations: [

            "正解です。Systems ManagerはEC2の運用管理に利用できます。",

            "Inspectorは脆弱性管理サービスです。",

            "CloudTrailはAPI操作ログを記録します。",

            "Route 53はDNSサービスです。"

        ]
    },


    {
        id: "q010",

        category: "EC2",

        difficulty: "標準",

        question:
            "突然アクセスが増加するWebアプリケーションで、EC2インスタンスの台数を自動的に増減させたい。適切な機能はどれですか？",

        choices: [
            "Auto Scaling",
            "CloudFront",
            "S3 Lifecycle",
            "AWS Backup"
        ],

        answer: 0,

        explanation:
            "EC2 Auto Scalingを使用すると、CPU使用率などの条件に応じてEC2インスタンス数を自動的に増減できます。",

        choiceExplanations: [

            "正解です。Auto Scalingは需要に応じてインスタンス数を調整できます。",

            "CloudFrontはコンテンツ配信サービスです。",

            "S3 LifecycleはS3オブジェクトのライフサイクル管理です。",

            "AWS Backupはバックアップを集中管理するサービスです。"

        ]
    },


    {
        id: "q011",

        category: "EC2",

        difficulty: "やや難",

        question:
            "EC2インスタンスの起動・停止などをスケジュールに従って自動化したい。適切なサービスの組み合わせはどれですか？",

        choices: [
            "EventBridge + Lambda",
            "CloudFront + S3",
            "Route 53 + CloudFront",
            "IAM + S3"
        ],

        answer: 0,

        explanation:
            "Amazon EventBridgeのスケジュール機能からLambdaを呼び出し、EC2の起動・停止APIを実行する構成が利用できます。",

        choiceExplanations: [

            "正解です。EventBridgeとLambdaを組み合わせることでスケジュール処理を実装できます。",

            "CloudFrontとS3はコンテンツ配信などに使用します。",

            "Route 53とCloudFrontはDNS・CDN用途です。",

            "IAMとS3だけではスケジュール処理は実現できません。"

        ]
    },


    {
        id: "q012",

        category: "S3 / Storage",

        difficulty: "標準",

        question:
            "S3に保存したデータを一定期間経過後に自動的に低コストなストレージクラスへ移行したい。使用する機能はどれですか？",

        choices: [
            "S3 Lifecycle",
            "S3 Transfer Acceleration",
            "S3 Object Lock",
            "S3 Access Points"
        ],

        answer: 0,

        explanation:
            "S3 Lifecycleを使用すると、オブジェクトを一定期間経過後に別のストレージクラスへ移行したり、削除したりできます。",

        choiceExplanations: [

            "正解です。Lifecycleルールでストレージクラス移行などを自動化できます。",

            "Transfer AccelerationはS3への高速転送に使用します。",

            "Object Lockはオブジェクトの変更・削除を防止するための機能です。",

            "Access PointsはS3へのアクセス管理を簡素化する機能です。"

        ]
    },


    {
        id: "q013",

        category: "S3 / Storage",

        difficulty: "標準",

        question:
            "S3バケット内のオブジェクトを誤って削除されないように保護したい。適切な機能はどれですか？",

        choices: [
            "S3 Versioning",
            "CloudFront",
            "NAT Gateway",
            "VPC Peering"
        ],

        answer: 0,

        explanation:
            "S3 Versioningを有効にすると、オブジェクトの複数バージョンを保持できます。誤削除した場合でも以前のバージョンを復元できます。",

        choiceExplanations: [

            "正解です。Versioningによってオブジェクトの過去バージョンを保持できます。",

            "CloudFrontはCDNサービスです。",

            "NAT Gatewayはネットワーク通信に使用します。",

            "VPC PeeringはVPC間接続に使用します。"

        ]
    },


    {
        id: "q014",

        category: "S3 / Storage",

        difficulty: "やや難",

        question:
            "S3に保存されたデータを特定のIPアドレスからのみアクセス可能にしたい。主にどのような方法を検討しますか？",

        choices: [
            "S3バケットポリシー",
            "CloudFront",
            "Auto Scaling",
            "Amazon Route 53"
        ],

        answer: 0,

        explanation:
            "S3バケットポリシーでは条件を指定してアクセスを制御できます。aws:SourceIpなどの条件キーを利用できます。",

        choiceExplanations: [

            "正解です。S3バケットポリシーで条件付きアクセス制御ができます。",

            "CloudFrontはコンテンツ配信サービスです。",

            "Auto Scalingはリソース数を自動調整する機能です。",

            "Route 53はDNSサービスです。"

        ]
    },


    {
        id: "q015",

        category: "S3 / Storage",

        difficulty: "やや難",

        question:
            "大容量データをS3へアップロードする際、ネットワーク障害が発生しても効率的に再開できる方法はどれですか？",

        choices: [
            "Multipart Upload",
            "S3 Versioning",
            "S3 Lifecycle",
            "S3 Object Lock"
        ],

        answer: 0,

        explanation:
            "Multipart Uploadでは大きなオブジェクトを複数のパートに分割してアップロードできます。失敗したパートだけ再送できます。",

        choiceExplanations: [

            "正解です。Multipart Uploadは大容量オブジェクトの効率的なアップロードに適しています。",

            "Versioningはオブジェクトバージョン管理です。",

            "Lifecycleはオブジェクトのライフサイクル管理です。",

            "Object Lockはオブジェクトの削除・変更を防止します。"

        ]
    },


    {
        id: "q016",

        category: "RDS / Database",

        difficulty: "標準",

        question:
            "RDSデータベースの障害発生時に自動的にスタンバイへ切り替えたい。適切な機能はどれですか？",

        choices: [
            "Read Replica",
            "Multi-AZ",
            "S3 Versioning",
            "Auto Scaling"
        ],

        answer: 1,

        explanation:
            "RDS Multi-AZでは、異なるAZにスタンバイDBを配置し、障害発生時に自動フェイルオーバーできます。",

        choiceExplanations: [

            "Read Replicaは主に読み取り負荷分散や読み取り性能向上に利用します。",

            "正解です。Multi-AZは高可用性と自動フェイルオーバーを提供します。",

            "S3 VersioningはS3の機能です。",

            "Auto ScalingはEC2などのリソース数調整に使用します。"

        ]
    },


    {
        id: "q017",

        category: "RDS / Database",

        difficulty: "標準",

        question:
            "RDSデータベースの読み取り負荷が高くなっている。読み取り処理を別のDBへ分散したい。適切な機能はどれですか？",

        choices: [
            "Multi-AZ",
            "Read Replica",
            "NAT Gateway",
            "Security Group"
        ],

        answer: 1,

        explanation:
            "Read Replicaはデータベースの読み取り処理を分散するために利用できます。",

        choiceExplanations: [

            "Multi-AZは主に高可用性・フェイルオーバーのための機能です。",

            "正解です。Read Replicaは読み取り負荷の分散に利用できます。",

            "NAT Gatewayはネットワーク通信に使用します。",

            "Security Groupはネットワークアクセス制御です。"

        ]
    },


    {
        id: "q018",

        category: "RDS / Database",

        difficulty: "やや難",

        question:
            "アプリケーションからRDSへの接続数が急増し、データベース接続管理が負荷になっている。接続プールを提供するサービスはどれですか？",

        choices: [
            "RDS Proxy",
            "CloudFront",
            "AWS WAF",
            "S3 Transfer Acceleration"
        ],

        answer: 0,

        explanation:
            "RDS Proxyはデータベース接続をプール・共有することで、アプリケーションからの大量のDB接続を効率的に管理できます。",

        choiceExplanations: [

            "正解です。RDS ProxyはDB接続のプールを提供します。",

            "CloudFrontはCDNサービスです。",

            "AWS WAFはWebアプリケーションの保護に使用します。",

            "S3 Transfer AccelerationはS3への転送高速化機能です。"

        ]
    },


    {
        id: "q019",

        category: "ELB / Auto Scaling",

        difficulty: "標準",

        question:
            "複数のEC2インスタンスへHTTP/HTTPSリクエストを分散したい。適切なロードバランサーはどれですか？",

        choices: [
            "Application Load Balancer",
            "Network Load Balancer",
            "NAT Gateway",
            "Route 53"
        ],

        answer: 0,

        explanation:
            "Application Load Balancer（ALB）はHTTP/HTTPSなどのアプリケーション層のトラフィックを分散します。",

        choiceExplanations: [

            "正解です。ALBはHTTP/HTTPSに適したロードバランサーです。",

            "NLBはTCP/UDP/TLSなどの低レイヤー通信に適しています。",

            "NAT Gatewayは外部通信のためのサービスです。",

            "Route 53はDNSサービスです。"

        ]
    },


    {
        id: "q020",

        category: "ELB / Auto Scaling",

        difficulty: "やや難",

        question:
            "EC2インスタンスに障害が発生した場合、自動的に新しいインスタンスを起動してWebサービスを維持したい。適切な構成はどれですか？",

        choices: [
            "EC2 Auto Scaling",
            "S3 Lifecycle",
            "CloudTrail",
            "IAM"
        ],

        answer: 0,

        explanation:
            "Auto Scaling Groupでは、EC2インスタンスのヘルスチェックに基づいて異常なインスタンスを置き換えることができます。",

        choiceExplanations: [

            "正解です。Auto Scaling Groupはインスタンスの自動置換が可能です。",

            "S3 LifecycleはS3オブジェクトの管理機能です。",

            "CloudTrailはAPI操作ログを記録します。",

            "IAMはアクセス権限管理です。"

        ]
    },


    {
        id: "q021",

        category: "ELB / Auto Scaling",

        difficulty: "標準",

        question:
            "Webアプリケーションを複数のAvailability Zoneに分散配置し、高可用性を実現したい。適切な構成はどれですか？",

        choices: [
            "1つのAZにすべてのEC2を配置する",
            "複数AZにEC2を配置しALBで分散する",
            "S3だけを使用する",
            "NAT Gatewayだけを使用する"
        ],

        answer: 1,

        explanation:
            "複数AZにEC2を配置し、ALBなどでトラフィックを分散することでAZ障害に対する可用性を高められます。",

        choiceExplanations: [

            "1つのAZに集中すると、そのAZの障害に弱くなります。",

            "正解です。複数AZへの分散は高可用性の基本構成です。",

            "S3だけでは一般的な動的Webアプリケーションの構成にはなりません。",

            "NAT GatewayだけではWebアプリケーションの負荷分散はできません。"

        ]
    },


    {
        id: "q022",

        category: "CloudFront / Route 53",

        difficulty: "標準",

        question:
            "世界中のユーザーにWebコンテンツを高速配信したい。適切なAWSサービスはどれですか？",

        choices: [
            "Amazon CloudFront",
            "Amazon RDS",
            "AWS IAM",
            "NAT Gateway"
        ],

        answer: 0,

        explanation:
            "Amazon CloudFrontはAWSのCDNサービスで、世界各地のエッジロケーションからコンテンツを配信できます。",

        choiceExplanations: [

            "正解です。CloudFrontはCDNとしてコンテンツ配信を高速化します。",

            "RDSはリレーショナルデータベースサービスです。",

            "IAMはアクセス権限管理サービスです。",

            "NAT Gatewayはネットワーク通信のためのサービスです。"

        ]
    },


    {
        id: "q023",

        category: "CloudFront / Route 53",

        difficulty: "標準",

        question:
            "ドメイン名からWebサーバーのIPアドレスなどへ名前解決を行いたい。使用するAWSサービスはどれですか？",

        choices: [
            "Amazon Route 53",
            "Amazon CloudFront",
            "AWS WAF",
            "AWS Shield"
        ],

        answer: 0,

        explanation:
            "Amazon Route 53はDNSサービスで、ドメイン名の名前解決やDNSルーティングを提供します。",

        choiceExplanations: [

            "正解です。Route 53はDNSサービスです。",

            "CloudFrontはCDNサービスです。",

            "AWS WAFはWebアプリケーションへの攻撃対策です。",

            "AWS ShieldはDDoS対策サービスです。"

        ]
    },


    {
        id: "q024",

        category: "Serverless",

        difficulty: "標準",

        question:
            "サーバーを管理せずにコードを実行したい。イベントに応じて処理を実行するAWSサービスはどれですか？",

        choices: [
            "Amazon EC2",
            "AWS Lambda",
            "Amazon RDS",
            "Amazon EBS"
        ],

        answer: 1,

        explanation:
            "AWS Lambdaはサーバーをプロビジョニング・管理せずにコードを実行できるサーバーレスコンピューティングサービスです。",

        choiceExplanations: [

            "EC2ではサーバーとなるインスタンスを管理します。",

            "正解です。Lambdaはサーバーレスでコードを実行できます。",

            "RDSはデータベースサービスです。",

            "EBSはEC2向けのブロックストレージです。"

        ]
    },


    {
        id: "q025",

        category: "Serverless",

        difficulty: "やや難",

        question:
            "Lambda関数をHTTP APIとして公開したい。適切なサービスはどれですか？",

        choices: [
            "API Gateway",
            "S3",
            "Route 53",
            "CloudWatch"
        ],

        answer: 0,

        explanation:
            "Amazon API Gatewayを利用すると、HTTP APIやREST APIなどのエンドポイントを作成し、Lambdaと統合できます。",

        choiceExplanations: [

            "正解です。API GatewayはAPIを作成・公開・管理できます。",

            "S3はオブジェクトストレージです。",

            "Route 53はDNSサービスです。",

            "CloudWatchは監視サービスです。"

        ]
    },


    {
        id: "q026",

        category: "High Availability / DR",

        difficulty: "標準",

        question:
            "災害発生時に別リージョンへシステムを切り替えられるようにしたい。複数リージョンを利用する主な目的はどれですか？",

        choices: [
            "コストを必ず削減するため",
            "リージョン障害への耐性を高めるため",
            "IAMを不要にするため",
            "DNSを不要にするため"
        ],

        answer: 1,

        explanation:
            "複数リージョンへシステムやデータを分散することで、リージョン全体の障害に対するDR（災害対策）を実現できます。",

        choiceExplanations: [

            "マルチリージョン化は必ずしもコスト削減にはなりません。",

            "正解です。リージョン障害への耐性を高めることが主な目的です。",

            "IAMが不要になるわけではありません。",

            "DNSも必要になる場合があります。"

        ]
    },


    {
        id: "q027",

        category: "High Availability / DR",

        difficulty: "やや難",

        question:
            "RTOをできるだけ短くしたい。一般的に最も迅速な復旧が期待できるDR戦略はどれですか？",

        choices: [
            "Backup and Restore",
            "Pilot Light",
            "Warm Standby",
            "Multi-site Active/Active"
        ],

        answer: 3,

        explanation:
            "Multi-site Active/Activeでは複数環境が同時に稼働しているため、障害時の切り替え時間を最小化できます。",

        choiceExplanations: [

            "Backup and Restoreは復旧までに時間がかかる傾向があります。",

            "Pilot Lightは最小限のリソースを稼働させる方式です。",

            "Warm Standbyは縮小した環境を常時稼働させる方式です。",

            "正解です。Active/Activeでは既に複数環境が稼働しています。"

        ]
    },


    {
        id: "q028",

        category: "High Availability / DR",

        difficulty: "標準",

        question:
            "AWS上の重要なデータを定期的にバックアップし、複数のAWSサービスを一元的にバックアップ管理したい。適切なサービスはどれですか？",

        choices: [
            "AWS Backup",
            "AWS WAF",
            "Amazon CloudFront",
            "Amazon Route 53"
        ],

        answer: 0,

        explanation:
            "AWS Backupを使用すると、AWSサービスのバックアップを一元管理できます。",

        choiceExplanations: [

            "正解です。AWS Backupは複数AWSサービスのバックアップを一元管理できます。",

            "WAFはWebアプリケーション保護サービスです。",

            "CloudFrontはCDNサービスです。",

            "Route 53はDNSサービスです。"

        ]
    },


    {
        id: "q029",

        category: "Cost Optimization",

        difficulty: "標準",

        question:
            "EC2の利用状況を確認し、不要なリソースを特定してコストを削減したい。利用状況やコストを分析するサービスはどれですか？",

        choices: [
            "AWS Cost Explorer",
            "AWS IAM",
            "Amazon GuardDuty",
            "AWS WAF"
        ],

        answer: 0,

        explanation:
            "AWS Cost Explorerを利用すると、AWSのコストや使用量を可視化・分析できます。",

        choiceExplanations: [

            "正解です。Cost Explorerでコストや使用量を分析できます。",

            "IAMはアクセス権限管理サービスです。",

            "GuardDutyは脅威検知サービスです。",

            "WAFはWebアプリケーション保護サービスです。"

        ]
    },


    {
        id: "q030",

        category: "Cost Optimization",

        difficulty: "やや難",

        question:
            "長期間安定して利用するEC2ワークロードのコストを削減したい。適切な選択肢はどれですか？",

        choices: [
            "オンデマンドインスタンスだけを利用する",
            "Savings Plansを検討する",
            "すべてのEC2を停止する",
            "S3 Glacierへ移行する"
        ],

        answer: 1,

        explanation:
            "安定した利用量が見込まれる場合、Savings Plansなどの料金モデルを利用することでオンデマンド料金よりコストを削減できる場合があります。",

        choiceExplanations: [

            "オンデマンドは柔軟性が高い一方、長期利用では割引の余地があります。",

            "正解です。Savings Plansは一定の利用コミットメントにより割引を受けられます。",

            "EC2を停止するとサービスを提供できなくなります。",

            "S3 Glacierはアーカイブ向けストレージであり、EC2の料金削減方法ではありません。"

        ]
    }

];


// =========================================================
// UTILITY
// =========================================================

function $(id) {
    return document.getElementById(id);
}


function calculateAccuracy(correct, total) {

    if (!total) {
        return 0;
    }

    return Math.round((correct / total) * 100);

}


function getTodayStart() {

    const date = new Date();

    date.setHours(0, 0, 0, 0);

    return date;

}


function getWeekStart() {

    const date = new Date();

    const day = date.getDay();

    const diff = day === 0 ? -6 : 1 - day;

    date.setDate(date.getDate() + diff);

    date.setHours(0, 0, 0, 0);

    return date;

}


function formatDate(date) {

    if (!date) {
        return "";
    }

    const d = date instanceof Date
        ? date
        : date.toDate();

    return d.toLocaleDateString("ja-JP");

}


function getQuestionById(id) {

    return questionDatabase.find(
        question => question.id === id
    );

}


// =========================================================
// FIRESTORE REFERENCES
// =========================================================

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


function getMockResultsCollection() {

    return collection(
        db,
        "users",
        currentUser.uid,
        "awsMockResults"
    );

}


// =========================================================
// LOAD AWS DATA
// =========================================================

async function loadAwsData() {

    if (!currentUser) {
        return;
    }

    try {

        const snapshot =
            await getDoc(getProgressRef());

        if (snapshot.exists()) {

            const data = snapshot.data();

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


// =========================================================
// SAVE AWS DATA
// =========================================================

async function saveAwsData() {

    if (!currentUser) {
        return;
    }

    try {

        await setDoc(
            getProgressRef(),
            awsData,
            {
                merge: true
            }
        );

    } catch (error) {

        console.error(
            "AWS data save error:",
            error
        );

    }

}


// =========================================================
// APPLY DATA TO UI
// =========================================================

function applyAwsDataToUI() {

    if ($("aws-progress-value")) {

        $("aws-progress-value").textContent =
            `${awsData.progress}%`;

    }


    if ($("aws-progress-text")) {

        $("aws-progress-text").textContent =
            `${awsData.progress}%`;

    }


    if ($("aws-progress-bar")) {

        $("aws-progress-bar").style.width =
            `${awsData.progress}%`;

    }


    if ($("aws-accuracy-value")) {

        $("aws-accuracy-value").textContent =
            `${awsData.accuracy}%`;

    }


    if ($("aws-question-count")) {

        $("aws-question-count").textContent =
            awsData.questionCount;

    }


    if ($("aws-target-date")) {

        $("aws-target-date").value =
            awsData.targetDate || "";

    }


    if ($("aws-progress-input")) {

        $("aws-progress-input").value =
            awsData.progress;

    }


    if ($("aws-target-questions-input")) {

        $("aws-target-questions-input").value =
            awsData.targetQuestions;

    }


    if ($("aws-daily-target-input")) {

        $("aws-daily-target-input").value =
            awsData.dailyTarget;

    }


    if ($("aws-note")) {

        $("aws-note").value =
            awsData.note || "";

    }


    updateGoalUI();

}


// =========================================================
// SAVE SETTINGS
// =========================================================

async function saveSettings() {

    const progress =
        Number($("aws-progress-input").value);

    const targetQuestions =
        Number($("aws-target-questions-input").value);

    const dailyTarget =
        Number($("aws-daily-target-input").value);

    const targetDate =
        $("aws-target-date").value;

    const note =
        $("aws-note").value;


    if (
        progress < 0 ||
        progress > 100
    ) {

        alert(
            "進捗率は0〜100の範囲で入力してください。"
        );

        return;

    }


    awsData.progress = progress;

    awsData.targetQuestions =
        targetQuestions || 1000;

    awsData.dailyTarget =
        dailyTarget || 10;

    awsData.targetDate =
        targetDate;

    awsData.note =
        note;


    await saveAwsData();

    applyAwsDataToUI();


    if ($("aws-save-status")) {

        $("aws-save-status").textContent =
            "保存しました。";

        setTimeout(() => {

            $("aws-save-status").textContent =
                "";

        }, 3000);

    }

}


// =========================================================
// LOAD HISTORY
// =========================================================

async function loadHistory() {

    if (!currentUser) {
        return;
    }

    try {

        const snapshot =
            await getDocs(
                getHistoryCollection()
            );


        questionHistory =
            snapshot.docs.map(
                document => ({
                    id: document.id,
                    ...document.data()
                })
            );


        questionHistory.sort(
            (a, b) => {

                const aDate =
                    a.answeredAt?.toDate
                        ? a.answeredAt.toDate()
                        : new Date(0);

                const bDate =
                    b.answeredAt?.toDate
                        ? b.answeredAt.toDate()
                        : new Date(0);

                return bDate - aDate;

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


// =========================================================
// LOAD FAVORITES
// =========================================================

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
            new Set(
                snapshot.docs.map(
                    document => document.id
                )
            );


        updateFavoriteButton();

    } catch (error) {

        console.error(
            "Favorites load error:",
            error
        );

    }

}


// =========================================================
// SAVE ANSWER HISTORY
// =========================================================

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
            "Answer history save error:",
            error
        );

    }

}


// =========================================================
// FAVORITE
// =========================================================

async function toggleFavorite() {

    if (!currentQuestion) {
        return;
    }

    if (!currentUser) {

        alert(
            "ログインしてください。"
        );

        return;

    }


    const ref = doc(
        getFavoritesCollection(),
        currentQuestion.id
    );


    try {

        if (
            favoriteQuestionIds.has(
                currentQuestion.id
            )
        ) {

            await deleteDoc(ref);

            favoriteQuestionIds.delete(
                currentQuestion.id
            );

        } else {

            await setDoc(
                ref,
                {

                    questionId:
                        currentQuestion.id,

                    createdAt:
                        Timestamp.now()

                }
            );

            favoriteQuestionIds.add(
                currentQuestion.id
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


// =========================================================
// FAVORITE BUTTON UI
// =========================================================

function updateFavoriteButton() {

    if (!$("favorite-button")) {
        return;
    }

    if (!currentQuestion) {

        $("favorite-button").textContent =
            "☆ お気に入り";

        return;

    }


    if (
        favoriteQuestionIds.has(
            currentQuestion.id
        )
    ) {

        $("favorite-button").textContent =
            "★ お気に入り";

    } else {

        $("favorite-button").textContent =
            "☆ お気に入り";

    }

}


// =========================================================
// ANALYTICS
// =========================================================

function updateAnalytics() {

    updateDailyStatistics();

    updateWeeklyStatistics();

    updateCategoryPerformance();

    updateWeakAreas();

    updateStreak();

    updateGoalUI();

}


// =========================================================
// DAILY STATISTICS
// =========================================================

function updateDailyStatistics() {

    const start =
        getTodayStart();


    const todayHistory =
        questionHistory.filter(
            item => {

                if (!item.answeredAt?.toDate) {
                    return false;
                }

                return (
                    item.answeredAt.toDate() >=
                    start
                );

            }
        );


    const correct =
        todayHistory.filter(
            item => item.isCorrect
        ).length;


    if ($("today-question-count")) {

        $("today-question-count").textContent =
            todayHistory.length;

    }


    if ($("today-accuracy")) {

        $("today-accuracy").textContent =
            `${calculateAccuracy(
                correct,
                todayHistory.length
            )}%`;

    }

}


// =========================================================
// WEEKLY STATISTICS
// =========================================================

function updateWeeklyStatistics() {

    const start =
        getWeekStart();


    const weekHistory =
        questionHistory.filter(
            item => {

                if (!item.answeredAt?.toDate) {
                    return false;
                }

                return (
                    item.answeredAt.toDate() >=
                    start
                );

            }
        );


    const correct =
        weekHistory.filter(
            item => item.isCorrect
        ).length;


    if ($("week-question-count")) {

        $("week-question-count").textContent =
            weekHistory.length;

    }


    if ($("week-accuracy")) {

        $("week-accuracy").textContent =
            `${calculateAccuracy(
                correct,
                weekHistory.length
            )}%`;

    }

}


// =========================================================
// CATEGORY PERFORMANCE
// =========================================================

function updateCategoryPerformance() {

    const container =
        $("category-performance");

    if (!container) {
        return;
    }


    container.innerHTML = "";


    categories.forEach(category => {

        const items =
            questionHistory.filter(
                item =>
                    item.category === category
            );


        const correct =
            items.filter(
                item => item.isCorrect
            ).length;


        const accuracy =
            calculateAccuracy(
                correct,
                items.length
            );


        const row =
            document.createElement("div");


        row.className =
            "category-performance-row";


        row.innerHTML = `

            <div class="category-name">
                ${category}
            </div>

            <div class="category-count">
                ${items.length}問
            </div>

            <div class="category-accuracy">
                ${accuracy}%
            </div>

        `;


        container.appendChild(row);

    });

}


// =========================================================
// WEAK AREAS
// =========================================================

function updateWeakAreas() {

    const container =
        $("weak-areas");

    if (!container) {
        return;
    }


    container.innerHTML = "";


    const weakCategories = [];


    categories.forEach(category => {

        const items =
            questionHistory.filter(
                item =>
                    item.category === category
            );


        if (items.length < 3) {
            return;
        }


        const correct =
            items.filter(
                item => item.isCorrect
            ).length;


        const accuracy =
            calculateAccuracy(
                correct,
                items.length
            );


        if (accuracy < 60) {

            weakCategories.push({

                category,
                accuracy,
                count: items.length

            });

        }

    });


    if (!weakCategories.length) {

        container.innerHTML =
            "<p>現在、明確な弱点はありません。</p>";

        return;

    }


    weakCategories
        .sort(
            (a, b) =>
                a.accuracy - b.accuracy
        )
        .forEach(item => {

            const element =
                document.createElement("div");


            element.className =
                "weak-area-item";


            element.textContent =
                `${item.category}：${item.accuracy}%`;


            container.appendChild(element);

        });

}


// =========================================================
// STREAK
// =========================================================

function updateStreak() {

    const dates =
        new Set();


    questionHistory.forEach(item => {

        if (!item.answeredAt?.toDate) {
            return;
        }


        const date =
            item.answeredAt.toDate();


        const key =
            date.toISOString()
                .slice(0, 10);


        dates.add(key);

    });


    let streak = 0;

    let current =
        new Date();


    current.setHours(
        0,
        0,
        0,
        0
    );


    while (true) {

        const key =
            current.toISOString()
                .slice(0, 10);


        if (!dates.has(key)) {
            break;
        }


        streak++;


        current.setDate(
            current.getDate() - 1
        );

    }


    if ($("streak-count")) {

        $("streak-count").textContent =
            streak;

    }


    const calendar =
        $("streak-calendar");


    if (!calendar) {
        return;
    }


    calendar.innerHTML = "";


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
            date.toISOString()
                .slice(0, 10);


        const day =
            document.createElement("div");


        day.className =
            dates.has(key)
                ? "streak-day active"
                : "streak-day";


        day.title =
            formatDate(date);


        calendar.appendChild(day);

    }


    if ($("longest-streak")) {

        $("longest-streak").textContent =
            calculateLongestStreak(dates);

    }

}


// =========================================================
// LONGEST STREAK
// =========================================================

function calculateLongestStreak(
    dates
) {

    if (!dates.size) {
        return 0;
    }


    const sorted =
        [...dates].sort();


    let longest = 1;

    let current = 1;


    for (
        let i = 1;
        i < sorted.length;
        i++
    ) {

        const previous =
            new Date(sorted[i - 1]);


        const currentDate =
            new Date(sorted[i]);


        const difference =
            (
                currentDate -
                previous
            ) /
            (
                1000 *
                60 *
                60 *
                24
            );


        if (difference === 1) {

            current++;

            longest =
                Math.max(
                    longest,
                    current
                );

        } else {

            current = 1;

        }

    }


    return longest;

}


// =========================================================
// GOAL UI
// =========================================================

function updateGoalUI() {

    if ($("goal-target-date")) {

        $("goal-target-date").textContent =
            awsData.targetDate || "未設定";

    }


    if ($("goal-target-questions")) {

        const remaining =
            Math.max(
                awsData.targetQuestions -
                awsData.questionCount,
                0
            );


        $("goal-target-questions").textContent =
            remaining;

    }


    if ($("goal-today-target")) {

        $("goal-today-target").textContent =
            awsData.dailyTarget;

    }


    if ($("goal-days-left")) {

        if (!awsData.targetDate) {

            $("goal-days-left").textContent =
                "—";

        } else {

            const target =
                new Date(
                    `${awsData.targetDate}T23:59:59`
                );


            const now =
                new Date();


            const diff =
                Math.ceil(
                    (
                        target - now
                    ) /
                    (
                        1000 *
                        60 *
                        60 *
                        24
                    )
                );


            $("goal-days-left").textContent =
                Math.max(diff, 0);

        }

    }

}


// =========================================================
// FILTER
// =========================================================

function getFilteredQuestions() {

    if (currentFilter === "weak") {

        const weakCategoryNames =
            new Set();


        categories.forEach(category => {

            const items =
                questionHistory.filter(
                    item =>
                        item.category === category
                );


            if (items.length < 3) {
                return;
            }


            const correct =
                items.filter(
                    item => item.isCorrect
                ).length;


            const accuracy =
                calculateAccuracy(
                    correct,
                    items.length
                );


            if (accuracy < 60) {

                weakCategoryNames.add(
                    category
                );

            }

        });


        return questionDatabase.filter(
            question =>
                weakCategoryNames.has(
                    question.category
                )
        );

    }


    if (currentFilter === "wrong") {

        return questionDatabase.filter(
            question =>
                wrongQuestionIds.has(
                    question.id
                )
        );

    }


    return [
        ...questionDatabase
    ];

}


// =========================================================
// RANDOM QUESTION
// =========================================================

function getRandomQuestion(pool) {

    if (!pool.length) {
        return null;
    }


    let candidates =
        pool;


    if (
        pool.length > 1 &&
        previousQuestionId
    ) {

        candidates =
            pool.filter(
                question =>
                    question.id !==
                    previousQuestionId
            );

    }


    const index =
        Math.floor(
            Math.random() *
            candidates.length
        );


    const question =
        candidates[index];


    previousQuestionId =
        question.id;


    return question;

}


// =========================================================
// START STUDY
// =========================================================

function startStudy(
    mode = "normal"
) {

    stopMockExam();


    studyMode =
        mode;


    currentFilter =
        mode === "normal"
            ? "all"
            : mode;


    currentStudyQuestions =
        getFilteredQuestions();


    currentStudyIndex =
        0;


    if (!currentStudyQuestions.length) {

        alert(
            "対象となる問題がありません。"
        );

        return;

    }


    renderQuestion();


    if ($("study-section")) {

        $("study-section")
            .scrollIntoView({
                behavior: "smooth"
            });

    }

}


// =========================================================
// RENDER QUESTION
// =========================================================

function renderQuestion() {

    const pool =
        currentStudyQuestions.length
            ? currentStudyQuestions
            : questionDatabase;


    currentQuestion =
        getRandomQuestion(pool);


    if (!currentQuestion) {
        return;
    }


    if ($("question-number")) {

        $("question-number").textContent =
            `QUESTION ${awsData.questionCount + 1}`;

    }


    if ($("question-tags")) {

        $("question-tags").innerHTML = `

            <span>
                ${currentQuestion.category}
            </span>

            <span>
                ${currentQuestion.difficulty}
            </span>

        `;

    }


    if ($("question-text")) {

        $("question-text").textContent =
            currentQuestion.question;

    }


    const answerList =
        $("answer-list");


    if (!answerList) {
        return;
    }


    answerList.innerHTML = "";


    currentQuestion.choices.forEach(
        (choice, index) => {

            const button =
                document.createElement("button");


            button.className =
                "answer-button";


            button.textContent =
                `${String.fromCharCode(65 + index)}. ${choice}`;


            button.addEventListener(
                "click",
                () =>
                    answerQuestion(index)
            );


            answerList.appendChild(
                button
            );

        }
    );


    if ($("question-result")) {

        $("question-result").innerHTML =
            "";

        $("question-result").style.display =
            "none";

    }


    if ($("next-question-button")) {

        $("next-question-button").style.display =
            "none";

    }


    updateFavoriteButton();

}


// =========================================================
// ANSWER QUESTION
// =========================================================

async function answerQuestion(
    selectedIndex
) {

    if (!currentQuestion) {
        return;
    }


    const buttons =
        document.querySelectorAll(
            ".answer-button"
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


    buttons.forEach(
        (button, index) => {

            if (index === correctIndex) {

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


    if (isCorrect) {

        awsData.correctCount++;

    } else {

        awsData.incorrectCount++;

        wrongQuestionIds.add(
            currentQuestion.id
        );

    }


    awsData.questionCount++;


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


    applyAwsDataToUI();


    const result =
        $("question-result");


    if (result) {

        result.style.display =
            "block";


        result.innerHTML = `

            <div class="result-title">
                ${
                    isCorrect
                        ? "🎉 正解！"
                        : "❌ 不正解"
                }
            </div>

            <div class="result-explanation">
                ${
                    currentQuestion
                        .choiceExplanations[
                            selectedIndex
                        ]
                }
            </div>

            <div class="result-explanation">
                <strong>解説：</strong><br>
                ${
                    currentQuestion.explanation
                }
            </div>

        `;

    }


    if ($("next-question-button")) {

        $("next-question-button").style.display =
            "block";

    }


    updateAnalytics();

}


// =========================================================
// NEXT QUESTION
// =========================================================

function nextQuestion() {

    if (
        studyMode === "wrong"
    ) {

        currentStudyQuestions =
            getFilteredQuestions();


        if (
            !currentStudyQuestions.length
        ) {

            alert(
                "現在、間違えた問題はありません。"
            );

            return;

        }

    }


    currentStudyIndex++;


    renderQuestion();

}


// =========================================================
// SETUP FILTERS
// =========================================================

function setupFilters() {

    const buttons =
        document.querySelectorAll(
            ".filter-button"
        );


    buttons.forEach(button => {

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
                    button.dataset.filter ||
                    "all";


                currentStudyQuestions =
                    getFilteredQuestions();


                currentStudyIndex =
                    0;


                if (
                    currentStudyQuestions.length
                ) {

                    renderQuestion();

                } else {

                    alert(
                        "対象となる問題がありません。"
                    );

                }

            }
        );

    });

}


// =========================================================
// REBUILD WRONG QUESTIONS
// =========================================================

function rebuildWrongQuestions() {

    const latest =
        new Map();


    questionHistory.forEach(
        item => {

            if (!item.questionId) {
                return;
            }


            latest.set(
                item.questionId,
                item
            );

        }
    );


    wrongQuestionIds =
        new Set();


    latest.forEach(
        (item, questionId) => {

            if (!item.isCorrect) {

                wrongQuestionIds.add(
                    questionId
                );

            }

        }
    );

}


// =========================================================
// MOCK EXAM
// =========================================================

function startMockExam() {

    currentStudyQuestions = [];


    mockQuestions =
        createMockQuestions();


    mockAnswers =
        new Array(
            mockQuestions.length
        ).fill(null);


    mockMarked =
        new Array(
            mockQuestions.length
        ).fill(false);


    mockCurrentIndex =
        0;


    mockStartedAt =
        new Date();


    renderMockQuestion();

    startMockTimer();


    if ($("study-section")) {

        $("study-section")
            .scrollIntoView({
                behavior: "smooth"
            });

    }

}


// =========================================================
// CREATE MOCK QUESTIONS
// =========================================================

function createMockQuestions() {

    const shuffled =
        [
            ...questionDatabase
        ].sort(
            () =>
                Math.random() - 0.5
        );


    const result = [];


    while (
        result.length <
        MOCK_TOTAL
    ) {

        result.push(
            shuffled[
                result.length %
                shuffled.length
            ]
        );

    }


    return result;

}


// =========================================================
// RENDER MOCK QUESTION
// =========================================================

function renderMockQuestion() {

    const question =
        mockQuestions[
            mockCurrentIndex
        ];


    if (!question) {
        return;
    }


    currentQuestion =
        question;


    if ($("question-number")) {

        $("question-number").textContent =
            `MOCK ${mockCurrentIndex + 1} / ${mockQuestions.length}`;

    }


    if ($("question-tags")) {

        $("question-tags").innerHTML = `

            <span>
                ${question.category}
            </span>

            <span>
                ${question.difficulty}
            </span>

        `;

    }


    if ($("question-text")) {

        $("question-text").textContent =
            question.question;

    }


    const answerList =
        $("answer-list");


    if (!answerList) {
        return;
    }


    answerList.innerHTML = "";


    question.choices.forEach(
        (choice, index) => {

            const button =
                document.createElement("button");


            button.className =
                "answer-button";


            button.textContent =
                `${String.fromCharCode(65 + index)}. ${choice}`;


            if (
                mockAnswers[
                    mockCurrentIndex
                ] === index
            ) {

                button.classList.add(
                    "selected"
                );

            }


            button.addEventListener(
                "click",
                () => {

                    mockAnswers[
                        mockCurrentIndex
                    ] = index;


                    renderMockQuestion();

                }
            );


            answerList.appendChild(
                button
            );

        }
    );


    if ($("question-result")) {

        $("question-result").style.display =
            "none";

    }


    if ($("next-question-button")) {

        $("next-question-button").style.display =
            "none";

    }

}


// =========================================================
// MOCK TIMER
// =========================================================

function startMockTimer() {

    stopMockTimer();


    const endTime =
        Date.now() +
        MOCK_TIME_SECONDS * 1000;


    mockTimerInterval =
        setInterval(
            () => {

                const remaining =
                    Math.max(
                        0,
                        Math.floor(
                            (
                                endTime -
                                Date.now()
                            ) / 1000
                        )
                    );


                updateMockTimer(
                    remaining
                );


                if (
                    remaining <= 0
                ) {

                    finishMockExam();

                }

            },
            1000
        );

}


// =========================================================
// UPDATE MOCK TIMER
// =========================================================

function updateMockTimer(
    seconds
) {

    const minutes =
        Math.floor(
            seconds / 60
        );


    const remainingSeconds =
        seconds % 60;


    const text =
        `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;


    const timer =
        document.querySelector(
            ".mock-timer"
        );


    if (timer) {

        timer.textContent =
            text;

    }

}


// =========================================================
// STOP MOCK TIMER
// =========================================================

function stopMockTimer() {

    if (mockTimerInterval) {

        clearInterval(
            mockTimerInterval
        );

        mockTimerInterval =
            null;

    }

}


// =========================================================
// STOP MOCK EXAM
// =========================================================

function stopMockExam() {

    stopMockTimer();

    mockQuestions = [];

    mockAnswers = [];

    mockMarked = [];

    mockCurrentIndex = 0;

}


// =========================================================
// FINISH MOCK EXAM
// =========================================================

async function finishMockExam() {

    if (!mockQuestions.length) {
        return;
    }


    stopMockTimer();


    let correct = 0;


    mockQuestions.forEach(
        (question, index) => {

            if (
                mockAnswers[index] ===
                question.answer
            ) {

                correct++;

            }

        }
    );


    const total =
        mockQuestions.length;


    const score =
        Math.round(
            (correct / total) * 100
        );


    const elapsedSeconds =
        mockStartedAt
            ? Math.floor(
                (
                    Date.now() -
                    mockStartedAt.getTime()
                ) / 1000
            )
            : 0;


    const estimate =
        score >= 80
            ? "合格圏"
            : score >= 70
                ? "やや合格圏"
                : score >= 60
                    ? "要対策"
                    : "要強化";


    if (currentUser) {

        try {

            await addDoc(
                getMockResultsCollection(),
                {

                    correct,

                    total,

                    score,

                    elapsedSeconds,

                    estimate,

                    completedAt:
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


    if ($("mock-result-score")) {

        $("mock-result-score").textContent =
            `${score}%`;

    }


    if ($("mock-result-correct")) {

        $("mock-result-correct").textContent =
            `${correct} / ${total}`;

    }


    if ($("mock-result-total")) {

        $("mock-result-total").textContent =
            total;

    }


    if ($("mock-result-time")) {

        const minutes =
            Math.floor(
                elapsedSeconds / 60
            );


        const seconds =
            elapsedSeconds % 60;


        $("mock-result-time").textContent =
            `${minutes}分${seconds}秒`;

    }


    if ($("mock-result-estimate")) {

        $("mock-result-estimate").textContent =
            estimate;

    }


    if ($("mock-result-modal")) {

        $("mock-result-modal").style.display =
            "flex";

    }

}


// =========================================================
// SETUP AUTH
// =========================================================

function setupAuth() {

    onAuthStateChangedAuth(
        auth,
        async user => {

            currentUser =
                user;


            const authStatus =
                $("auth-status");


            if (user) {

                if (authStatus) {

                    authStatus.textContent =
                        user.email ||
                        "ログイン中";

                }


                await loadAwsData();

                await loadHistory();

                await loadFavorites();


                rebuildWrongQuestions();

                updateAnalytics();

            } else {

                if (authStatus) {

                    authStatus.textContent =
                        "未ログイン";

                }

            }

        }
    );

}


// =========================================================
// EVENT LISTENERS
// =========================================================

function setupEventListeners() {


    // -----------------------------------------
    // SETTINGS
    // -----------------------------------------

    if ($("aws-save-button")) {

        $("aws-save-button")
            .addEventListener(
                "click",
                saveSettings
            );

    }


    // -----------------------------------------
    // FAVORITE
    // -----------------------------------------

    if ($("favorite-button")) {

        $("favorite-button")
            .addEventListener(
                "click",
                toggleFavorite
            );

    }


    // -----------------------------------------
    // NEXT QUESTION
    // -----------------------------------------

    if ($("next-question-button")) {

        $("next-question-button")
            .addEventListener(
                "click",
                nextQuestion
            );

    }


    // -----------------------------------------
    // START STUDY
    // -----------------------------------------

    if ($("start-study-button")) {

        $("start-study-button")
            .addEventListener(
                "click",
                () =>
                    startStudy("normal")
            );

    }


    // -----------------------------------------
    // START MOCK
    // -----------------------------------------

    if ($("start-mock-button")) {

        $("start-mock-button")
            .addEventListener(
                "click",
                startMockExam
            );

    }


    // -----------------------------------------
    // START REVIEW
    // -----------------------------------------

    if ($("start-review-button")) {

        $("start-review-button")
            .addEventListener(
                "click",
                () => {

                    rebuildWrongQuestions();

                    startStudy("wrong");

                }
            );

    }


    // -----------------------------------------
    // CLOSE MOCK RESULT
    // -----------------------------------------

    if ($("close-mock-result")) {

        $("close-mock-result")
            .addEventListener(
                "click",
                () => {

                    if (
                        $("mock-result-modal")
                    ) {

                        $("mock-result-modal")
                            .style.display =
                            "none";

                    }

                }
            );

    }


    // -----------------------------------------
    // FILTERS
    // -----------------------------------------

    setupFilters();

}


// =========================================================
// INITIALIZE
// =========================================================

function initialize() {

    setupEventListeners();

    setupAuth();


    // -----------------------------------------
    // INITIAL DASHBOARD
    // -----------------------------------------

    updateAnalytics();


    // -----------------------------------------
    // INITIAL QUESTION
    // -----------------------------------------

    currentStudyQuestions =
        [
            ...questionDatabase
        ];


    renderQuestion();

}


// =========================================================
// START
// =========================================================

initialize();
