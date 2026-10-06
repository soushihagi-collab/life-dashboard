import {
    doc,
    getDoc,
    setDoc,
    addDoc,
    collection,
    getDocs,
    deleteDoc,
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
// LIFE DASHBOARD / AWS SAA 500-QUESTION EDITION
// 100 core SAA topics × 5 scenario phrasings = 500 questions
// =========================================================

let currentUser = null;
let currentQuestion = null;
let previousQuestionId = null;
let currentFilter = "all";
let currentCategory = "all";
let favoriteQuestionIds = new Set();
let wrongQuestionIds = new Set();
let wrongQuestionCounts = {};
let questionHistory = [];
let currentStudyQuestions = [];
let currentStudyIndex = 0;
let studyMode = "normal";

let mockQuestions = [];
let mockAnswers = [];
let mockMarked = [];
let mockCurrentIndex = 0;
let mockStartedAt = null;
let mockTimerInterval = null;
const MOCK_TOTAL = 65;
const MOCK_TIME_SECONDS = 120 * 60;

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
// SERVICE EXPLANATIONS
// =========================================================

const SERVICE_INFO = {
    "IAM":"AWSリソースへのアクセス権限をユーザー、グループ、ロール、ポリシーで管理するサービス。",
    "IAM Role":"長期アクセスキーを保存せず、一時的な認証情報でAWSリソースへアクセスさせる仕組み。",
    "SCP":"AWS OrganizationsでアカウントやOUに対する最大権限を制限するポリシー。",
    "IAM Identity Center":"複数AWSアカウントやアプリケーションへの人間ユーザーのSSOアクセスを一元管理するサービス。",
    "STS":"一時的なAWS認証情報を発行し、ロール引き受けなどに利用するサービス。",
    "KMS":"暗号化キーを作成・管理し、AWSサービスやアプリケーションの暗号化に利用するサービス。",
    "Secrets Manager":"DBパスワードやAPIキーなどの機密情報を安全に保存し、ローテーションも支援するサービス。",
    "CloudTrail":"AWS API操作などの監査イベントを記録し、誰が何をしたか追跡するサービス。",
    "GuardDuty":"AWS環境のログやイベントを分析して、脅威や不審な活動を検知するサービス。",
    "WAF":"HTTP/HTTPSリクエストをルールで検査し、Webアプリケーションを攻撃から保護するサービス。",
    "VPC":"AWS上に論理的に分離されたネットワークを構築するサービス。",
    "Internet Gateway":"VPCとインターネット間の通信経路を提供するVPCコンポーネント。",
    "NAT Gateway":"プライベートサブネットのリソースから外部へアウトバウンド通信するためのマネージドNAT。",
    "VPC Endpoint":"VPCからAWSサービスなどへインターネットを経由せず接続するための機能。",
    "VPC Peering":"2つのVPC間でプライベートIPによる通信を可能にする接続方式。",
    "Transit Gateway":"多数のVPCやオンプレミスネットワークをハブ型で接続するサービス。",
    "Site-to-Site VPN":"インターネット経由でオンプレミスとAWS VPCを暗号化接続するVPNサービス。",
    "Direct Connect":"オンプレミスとAWSを専用ネットワーク接続で結ぶサービス。",
    "Security Group":"ENI単位で通信を制御するステートフルな仮想ファイアウォール。",
    "Network ACL":"サブネット境界で通信を制御するステートレスなアクセス制御。",
    "EC2":"仮想サーバーを提供し、OSやインスタンスタイプなどを利用者が管理できるサービス。",
    "AMI":"EC2のOSやソフトウェア設定を含む起動用イメージ。",
    "EBS":"EC2に接続する永続的なブロックストレージ。",
    "Instance Store":"EC2ホストに直接接続された高速な一時ストレージ。",
    "Auto Scaling":"需要やヘルスチェックに応じてEC2インスタンス数などを自動調整する仕組み。",
    "Systems Manager":"EC2などのマネージドノードを安全に運用、パッチ適用、コマンド実行するサービス。",
    "Spot Instances":"中断されてもよいワークロードで余剰EC2容量を低価格で利用する料金方式。",
    "Reserved Instances":"長期利用を前提にEC2などの料金割引を得る購入モデル。",
    "Elastic IP":"固定のパブリックIPv4アドレスをAWSリソースへ割り当てる機能。",
    "Placement Group":"EC2インスタンスの物理配置を制御して、低遅延や高耐障害性などを実現する機能。",
    "S3":"高耐久なオブジェクトストレージサービス。",
    "S3 Versioning":"S3オブジェクトの複数バージョンを保持する機能。",
    "S3 Lifecycle":"オブジェクトを経過時間に応じて別ストレージクラスへ移行・削除する機能。",
    "S3 Glacier":"アクセス頻度の低い長期保存データを低コストで保管するS3系アーカイブストレージ。",
    "S3 Object Lock":"保持期間や保持モードによりS3オブジェクトの変更・削除を防止する機能。",
    "S3 Replication":"S3オブジェクトを別バケットなどへ自動複製する機能。",
    "S3 Multipart Upload":"大容量オブジェクトを複数パートに分けてアップロードする機能。",
    "S3 Transfer Acceleration":"エッジロケーションを経由して遠隔地からS3への転送を高速化する機能。",
    "EFS":"複数のEC2などから同時利用できるマネージドNFSファイルシステム。",
    "FSx":"Windows File Serverなど用途別のマネージドファイルシステム。",
    "RDS":"MySQLやPostgreSQLなどのリレーショナルデータベースをマネージドで提供するサービス。",
    "RDS Multi-AZ":"DB障害時の自動フェイルオーバーを目的とした高可用性構成。",
    "RDS Read Replica":"読み取り処理をレプリカへ分散して読み取り性能を向上させる機能。",
    "Aurora":"AWSが提供する高性能・高可用性のリレーショナルデータベース。",
    "RDS Proxy":"RDSへのDB接続をプールして接続確立・切断の負荷を抑えるサービス。",
    "DynamoDB":"フルマネージドで高スケールなNoSQLデータベース。",
    "DAX":"DynamoDB向けのインメモリキャッシュ。",
    "ElastiCache":"Redisなどのインメモリデータストアを利用してDB負荷とレイテンシを低減するサービス。",
    "Redshift":"大規模な分析処理に適したクラウドデータウェアハウス。",
    "Athena":"S3上のデータをサーバーレスでSQL分析するサービス。",
    "ALB":"HTTP/HTTPSを対象にホスト名やパスなどの条件でトラフィックを分散するロードバランサー。",
    "NLB":"TCP/UDP/TLSなどの高性能・低遅延なネットワークトラフィックを分散するロードバランサー。",
    "GWLB":"仮想ネットワークアプライアンスを透過的に挿入してトラフィックを処理するロードバランサー。",
    "Target Group":"ロードバランサーの送信先ターゲットとヘルスチェックを管理する単位。",
    "Auto Scaling Group":"EC2インスタンスの最小・希望・最大容量を維持し、異常インスタンスを置換する仕組み。",
    "Health Check":"ターゲットやエンドポイントの健全性を定期的に確認する仕組み。",
    "Step Scaling":"CloudWatchメトリクスの閾値に応じて容量を段階的に変更するAuto Scaling方式。",
    "Target Tracking":"CPU使用率などの目標値を維持するようAuto Scalingを調整する方式。",
    "Sticky Sessions":"同じユーザーのリクエストを同じターゲットへ送るセッション維持機能。",
    "Cross-Zone Load Balancing":"ロードバランサーから複数AZのターゲットへトラフィックを分散する機能。",
    "CloudFront":"AWSのCDN。エッジロケーションからコンテンツを低レイテンシで配信する。",
    "Route 53":"DNS名前解決、ドメイン登録、DNSベースのルーティングを提供するサービス。",
    "Route 53 Failover":"ヘルスチェックなどに基づきプライマリからセカンダリへDNSを切り替えるルーティング方式。",
    "Route 53 Weighted":"重み付けに基づいて複数エンドポイントへDNSトラフィックを分配する方式。",
    "Route 53 Latency":"ユーザーに最も低いレイテンシが期待できるリージョンへルーティングする方式。",
    "Route 53 Geolocation":"ユーザーの地理的位置に基づいてDNSルーティングする方式。",
    "Origin Shield":"CloudFrontのオリジン前に追加キャッシュ層を置き、オリジン負荷を低減する機能。",
    "Signed URL":"署名付きURLによりCloudFrontなどの限定コンテンツへのアクセスを制御する仕組み。",
    "CloudFront Functions":"CloudFrontエッジで軽量なJavaScript処理を実行する機能。",
    "Lambda":"サーバーを管理せずイベント駆動でコードを実行するサーバーレスサービス。",
    "API Gateway":"HTTP APIやREST APIなどのAPIを作成・公開・管理するサービス。",
    "SQS":"コンポーネント間を非同期に疎結合化するメッセージキュー。",
    "SNS":"1つのメッセージを複数の購読先へ配信するPub/Sub通知サービス。",
    "EventBridge":"イベントをルールに基づいて各ターゲットへルーティングするサービス。",
    "Step Functions":"複数処理を状態機械として順序、分岐、リトライ付きで実行するオーケストレーションサービス。",
    "Fargate":"サーバーを管理せずECS/EKSコンテナを実行するコンピューティングエンジン。",
    "Cognito":"Webやモバイルアプリのユーザー認証・認可とID管理を提供するサービス。",
    "AppSync":"GraphQL APIを提供し複数データソースを統合するサービス。",
    "AWS Backup":"複数AWSサービスのバックアップをポリシーで一元管理するサービス。",
    "Backup and Restore":"バックアップから障害環境を復元する、比較的低コストだがRTOが長くなりやすいDR方式。",
    "Pilot Light":"最小限の基盤を別環境で稼働させ、障害時に本格的にスケールするDR方式。",
    "Warm Standby":"縮小した本番環境を常時稼働させ、障害時にスケールアップするDR方式。",
    "Active/Active":"複数環境を同時稼働させ、障害時の切替時間を最小化するDR方式。",
    "Aurora Global Database":"Auroraデータを複数リージョンへレプリケーションしてDRやグローバル展開を支援する機能。",
    "S3 CRR":"S3オブジェクトを別リージョンへ自動複製するCross-Region Replication。",
    "RTO":"障害発生から復旧までに許容される最大時間。",
    "RPO":"障害発生時に許容できるデータ損失量を時間で表した目標。",
    "Cost Explorer":"AWSコストと使用量を可視化・分析するサービス。",
    "AWS Budgets":"予算や使用量のしきい値を設定し、アラートを出すサービス。",
    "Savings Plans":"一定の利用コミットメントに対してコンピューティング料金の割引を得る料金モデル。",
    "S3 Intelligent-Tiering":"アクセスパターンに応じてS3データを自動的に適切なアクセス層へ移動するストレージクラス。",
    "Right Sizing":"実際の利用状況に合わせてリソースサイズを適正化するコスト最適化手法。",
    "Serverless":"サーバーのプロビジョニングや管理を利用者が直接行わず、実行量に応じて利用する方式。",
    "DAX":"DynamoDB向けのインメモリキャッシュサービス。",
    "NAT Gateway":"プライベートサブネットからインターネット等へアウトバウンド通信するためのNAT。",
    "Internet Gateway":"VPCとインターネットを接続するゲートウェイ。",
    "VPC Endpoint":"VPCからAWSサービスへプライベート接続する機能。",
    "VPC Peering":"VPC間のプライベート接続機能。",
    "Target Group":"ロードバランサーのターゲット集合とヘルスチェック設定を管理する単位。",
    "DynamoDB":"フルマネージドNoSQLデータベース。",
    "ElastiCache":"インメモリキャッシュサービス。",
    "Redshift":"分析向けデータウェアハウス。",
    "Athena":"S3データをSQLで分析するサーバーレスサービス。",
    "FSx":"用途別のマネージドファイルシステム。",
    "EFS":"共有ファイルストレージ。",
    "S3":"オブジェクトストレージ。",
    "RDS":"マネージドリレーショナルデータベース。",
    "EC2":"仮想サーバー。",
    "ALB":"HTTP/HTTPS向けロードバランサー。",
    "NLB":"高性能なL4系ロードバランサー。",
    "GWLB":"仮想ネットワークアプライアンス向けロードバランサー。",
    "CloudFront":"CDN。",
    "Lambda":"イベント駆動のサーバーレスコンピューティング。",
    "API Gateway":"API公開・管理サービス。",
    "SQS":"メッセージキュー。",
    "SNS":"Pub/Sub通知サービス。",
    "EventBridge":"イベントルーティングサービス。",
    "Step Functions":"ワークフローオーケストレーションサービス。",
    "Fargate":"サーバーレスなコンテナ実行基盤。",
    "Cognito":"アプリ向け認証・ID管理サービス。",
    "AppSync":"GraphQL APIサービス。",
    "AWS Backup":"バックアップ一元管理サービス。",
    "Cost Explorer":"コスト分析サービス。",
    "AWS Budgets":"予算アラートサービス。",
    "Savings Plans":"利用コミットメント型の割引モデル。",
    "Reserved Instances":"長期利用型の割引モデル。",
    "Spot Instances":"中断可能な低価格EC2利用方式。",
    "Auto Scaling":"需要に応じた自動スケーリング。",
    "S3 Glacier":"低頻度データのアーカイブ向けストレージ。",
    "S3 Lifecycle":"S3データの自動移行・削除ルール。",
    "S3 Versioning":"S3のバージョン保持機能。",
    "S3 Object Lock":"S3オブジェクトの変更・削除防止機能。",
    "S3 Replication":"S3オブジェクト複製機能。",
    "S3 Multipart Upload":"大容量S3アップロード機能。",
    "S3 Transfer Acceleration":"S3転送高速化機能。",
    "IAM":"AWSアクセス権限管理。",
    "CloudTrail":"AWS操作監査ログ。",
    "GuardDuty":"脅威検知サービス。",
    "WAF":"Webアプリ保護サービス。",
    "KMS":"暗号化キー管理。",
    "Secrets Manager":"機密情報管理。",
    "Systems Manager":"AWSリソース運用管理。",
    "AMI":"EC2起動用イメージ。",
    "EBS":"EC2ブロックストレージ。",
    "Instance Store":"EC2一時ストレージ。",
    "Elastic IP":"固定パブリックIPv4。",
    "Placement Group":"EC2物理配置制御。",
    "RDS Multi-AZ":"RDS高可用性・フェイルオーバー。",
    "RDS Read Replica":"RDS読み取りレプリカ。",
    "Aurora":"AWS高性能RDB。",
    "RDS Proxy":"DB接続プール。",
    "Route 53":"DNS。",
    "Route 53 Failover":"DNSフェイルオーバー。",
    "Route 53 Weighted":"重み付けDNSルーティング。",
    "Route 53 Latency":"低レイテンシDNSルーティング。",
    "Route 53 Geolocation":"地理情報DNSルーティング。",
    "Health Check":"エンドポイント健全性確認。",
    "S3 CRR":"S3クロスリージョン複製。",
    "Aurora Global Database":"Auroraマルチリージョンレプリケーション。",
    "Backup and Restore":"バックアップからの復旧型DR。",
    "Pilot Light":"最小構成を待機させるDR。",
    "Warm Standby":"縮小構成を常時稼働させるDR。",
    "Active/Active":"複数環境を同時稼働させるDR。",
    "RTO":"復旧時間目標。",
    "RPO":"復旧時点目標。",
    "Right Sizing":"リソース適正化。",
    "Serverless":"サーバー管理を意識しない実行モデル。",
    "DAX":"DynamoDBキャッシュ。",
    "Sticky Sessions":"セッション固定。",
    "Cross-Zone Load Balancing":"AZをまたぐ負荷分散。",
    "Origin Shield":"CloudFront追加キャッシュ層。",
    "Signed URL":"限定コンテンツ用署名URL。",
    "CloudFront Functions":"エッジJavaScript実行。"
};

// =========================================================
// QUESTION DATABASE — generated below from 100 SAA topics
// =========================================================

const questionDatabase = [
    {
        "id": "q001",
        "category": "IAM / Security",
        "difficulty": "標準",
        "question": "企業のAWS環境で「AWSリソースへのアクセス権限をユーザー・グループ・ロール・ポリシーで管理する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "IAM",
            "CloudTrail",
            "GuardDuty",
            "CloudWatch"
        ],
        "answer": 0,
        "explanation": "要件の中心は「AWSリソースへのアクセス権限をユーザー・グループ・ロール・ポリシーで管理する」です。したがってIAMを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。IAMは、AWSリソースへのアクセス権限をユーザー・グループ・ロール・ポリシーで管理するための選択肢です。",
            "CloudTrailは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "GuardDutyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "CloudWatchは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "IAM",
            "CloudTrail",
            "GuardDuty",
            "CloudWatch"
        ]
    },
    {
        "id": "q002",
        "category": "IAM / Security",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「AWSリソースへのアクセス権限をユーザー・グループ・ロール・ポリシーで管理する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "CloudTrail",
            "GuardDuty",
            "IAM",
            "WAF"
        ],
        "answer": 2,
        "explanation": "要件の中心は「AWSリソースへのアクセス権限をユーザー・グループ・ロール・ポリシーで管理する」です。したがってIAMを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "CloudTrailは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "GuardDutyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。IAMは、AWSリソースへのアクセス権限をユーザー・グループ・ロール・ポリシーで管理するための選択肢です。",
            "WAFは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "IAM",
            "CloudTrail",
            "GuardDuty",
            "WAF"
        ]
    },
    {
        "id": "q003",
        "category": "IAM / Security",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「AWSリソースへのアクセス権限をユーザー・グループ・ロール・ポリシーで管理する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "WAF",
            "IAM",
            "GuardDuty",
            "KMS"
        ],
        "answer": 1,
        "explanation": "要件の中心は「AWSリソースへのアクセス権限をユーザー・グループ・ロール・ポリシーで管理する」です。したがってIAMを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "WAFは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。IAMは、AWSリソースへのアクセス権限をユーザー・グループ・ロール・ポリシーで管理するための選択肢です。",
            "GuardDutyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "KMSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "IAM",
            "WAF",
            "GuardDuty",
            "KMS"
        ]
    },
    {
        "id": "q004",
        "category": "IAM / Security",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「AWSリソースへのアクセス権限をユーザー・グループ・ロール・ポリシーで管理する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "WAF",
            "KMS",
            "IAM",
            "Secrets Manager"
        ],
        "answer": 2,
        "explanation": "要件の中心は「AWSリソースへのアクセス権限をユーザー・グループ・ロール・ポリシーで管理する」です。したがってIAMを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "WAFは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "KMSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。IAMは、AWSリソースへのアクセス権限をユーザー・グループ・ロール・ポリシーで管理するための選択肢です。",
            "Secrets Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "IAM",
            "WAF",
            "KMS",
            "Secrets Manager"
        ]
    },
    {
        "id": "q005",
        "category": "IAM / Security",
        "difficulty": "やや難",
        "question": "設計レビューで「AWSリソースへのアクセス権限をユーザー・グループ・ロール・ポリシーで管理する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "IAM",
            "Security Group",
            "Secrets Manager",
            "KMS"
        ],
        "answer": 0,
        "explanation": "要件の中心は「AWSリソースへのアクセス権限をユーザー・グループ・ロール・ポリシーで管理する」です。したがってIAMを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。IAMは、AWSリソースへのアクセス権限をユーザー・グループ・ロール・ポリシーで管理するための選択肢です。",
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Secrets Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "KMSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "IAM",
            "Security Group",
            "Secrets Manager",
            "KMS"
        ]
    },
    {
        "id": "q006",
        "category": "IAM / Security",
        "difficulty": "標準",
        "question": "企業のAWS環境で「EC2やLambdaなどのAWSリソースに長期アクセスキーを保存せず一時認証情報を与える」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Secrets Manager",
            "IAM",
            "KMS",
            "WAF"
        ],
        "answer": 1,
        "explanation": "要件の中心は「EC2やLambdaなどのAWSリソースに長期アクセスキーを保存せず一時認証情報を与える」です。したがってIAMを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Secrets Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。IAMは、EC2やLambdaなどのAWSリソースに長期アクセスキーを保存せず一時認証情報を与えるための選択肢です。",
            "KMSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "WAFは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "IAM",
            "Secrets Manager",
            "KMS",
            "WAF"
        ]
    },
    {
        "id": "q007",
        "category": "IAM / Security",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「EC2やLambdaなどのAWSリソースに長期アクセスキーを保存せず一時認証情報を与える」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "KMS",
            "IAM",
            "Secrets Manager",
            "Security Group"
        ],
        "answer": 1,
        "explanation": "要件の中心は「EC2やLambdaなどのAWSリソースに長期アクセスキーを保存せず一時認証情報を与える」です。したがってIAMを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "KMSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。IAMは、EC2やLambdaなどのAWSリソースに長期アクセスキーを保存せず一時認証情報を与えるための選択肢です。",
            "Secrets Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "IAM",
            "KMS",
            "Secrets Manager",
            "Security Group"
        ]
    },
    {
        "id": "q008",
        "category": "IAM / Security",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「EC2やLambdaなどのAWSリソースに長期アクセスキーを保存せず一時認証情報を与える」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Security Group",
            "Route 53",
            "Secrets Manager",
            "IAM"
        ],
        "answer": 3,
        "explanation": "要件の中心は「EC2やLambdaなどのAWSリソースに長期アクセスキーを保存せず一時認証情報を与える」です。したがってIAMを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Secrets Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。IAMは、EC2やLambdaなどのAWSリソースに長期アクセスキーを保存せず一時認証情報を与えるための選択肢です。"
        ],
        "services": [
            "IAM",
            "Security Group",
            "Route 53",
            "Secrets Manager"
        ]
    },
    {
        "id": "q009",
        "category": "IAM / Security",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「EC2やLambdaなどのAWSリソースに長期アクセスキーを保存せず一時認証情報を与える」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "CloudWatch",
            "Security Group",
            "Route 53",
            "IAM"
        ],
        "answer": 3,
        "explanation": "要件の中心は「EC2やLambdaなどのAWSリソースに長期アクセスキーを保存せず一時認証情報を与える」です。したがってIAMを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "CloudWatchは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。IAMは、EC2やLambdaなどのAWSリソースに長期アクセスキーを保存せず一時認証情報を与えるための選択肢です。"
        ],
        "services": [
            "IAM",
            "CloudWatch",
            "Security Group",
            "Route 53"
        ]
    },
    {
        "id": "q010",
        "category": "IAM / Security",
        "difficulty": "やや難",
        "question": "設計レビューで「EC2やLambdaなどのAWSリソースに長期アクセスキーを保存せず一時認証情報を与える」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Route 53",
            "IAM",
            "CloudTrail",
            "CloudWatch"
        ],
        "answer": 1,
        "explanation": "要件の中心は「EC2やLambdaなどのAWSリソースに長期アクセスキーを保存せず一時認証情報を与える」です。したがってIAMを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。IAMは、EC2やLambdaなどのAWSリソースに長期アクセスキーを保存せず一時認証情報を与えるための選択肢です。",
            "CloudTrailは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "CloudWatchは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "IAM",
            "Route 53",
            "CloudTrail",
            "CloudWatch"
        ]
    },
    {
        "id": "q011",
        "category": "IAM / Security",
        "difficulty": "標準",
        "question": "企業のAWS環境で「AWS Organizations配下のアカウントで許可できる最大権限を組織単位で制限する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "CloudWatch",
            "Route 53",
            "Security Group",
            "SCP"
        ],
        "answer": 3,
        "explanation": "要件の中心は「AWS Organizations配下のアカウントで許可できる最大権限を組織単位で制限する」です。したがってSCPを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "CloudWatchは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。SCPは、AWS Organizations配下のアカウントで許可できる最大権限を組織単位で制限するための選択肢です。"
        ],
        "services": [
            "SCP",
            "CloudWatch",
            "Route 53",
            "Security Group"
        ]
    },
    {
        "id": "q012",
        "category": "IAM / Security",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「AWS Organizations配下のアカウントで許可できる最大権限を組織単位で制限する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "SCP",
            "CloudTrail",
            "CloudWatch",
            "Route 53"
        ],
        "answer": 0,
        "explanation": "要件の中心は「AWS Organizations配下のアカウントで許可できる最大権限を組織単位で制限する」です。したがってSCPを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。SCPは、AWS Organizations配下のアカウントで許可できる最大権限を組織単位で制限するための選択肢です。",
            "CloudTrailは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "CloudWatchは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "SCP",
            "CloudTrail",
            "CloudWatch",
            "Route 53"
        ]
    },
    {
        "id": "q013",
        "category": "IAM / Security",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「AWS Organizations配下のアカウントで許可できる最大権限を組織単位で制限する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "CloudTrail",
            "GuardDuty",
            "SCP",
            "CloudWatch"
        ],
        "answer": 2,
        "explanation": "要件の中心は「AWS Organizations配下のアカウントで許可できる最大権限を組織単位で制限する」です。したがってSCPを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "CloudTrailは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "GuardDutyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。SCPは、AWS Organizations配下のアカウントで許可できる最大権限を組織単位で制限するための選択肢です。",
            "CloudWatchは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "SCP",
            "CloudTrail",
            "GuardDuty",
            "CloudWatch"
        ]
    },
    {
        "id": "q014",
        "category": "IAM / Security",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「AWS Organizations配下のアカウントで許可できる最大権限を組織単位で制限する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "WAF",
            "GuardDuty",
            "CloudTrail",
            "SCP"
        ],
        "answer": 3,
        "explanation": "要件の中心は「AWS Organizations配下のアカウントで許可できる最大権限を組織単位で制限する」です。したがってSCPを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "WAFは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "GuardDutyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "CloudTrailは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。SCPは、AWS Organizations配下のアカウントで許可できる最大権限を組織単位で制限するための選択肢です。"
        ],
        "services": [
            "SCP",
            "WAF",
            "GuardDuty",
            "CloudTrail"
        ]
    },
    {
        "id": "q015",
        "category": "IAM / Security",
        "difficulty": "やや難",
        "question": "設計レビューで「AWS Organizations配下のアカウントで許可できる最大権限を組織単位で制限する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "WAF",
            "GuardDuty",
            "SCP",
            "KMS"
        ],
        "answer": 2,
        "explanation": "要件の中心は「AWS Organizations配下のアカウントで許可できる最大権限を組織単位で制限する」です。したがってSCPを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "WAFは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "GuardDutyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。SCPは、AWS Organizations配下のアカウントで許可できる最大権限を組織単位で制限するための選択肢です。",
            "KMSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "SCP",
            "WAF",
            "GuardDuty",
            "KMS"
        ]
    },
    {
        "id": "q016",
        "category": "IAM / Security",
        "difficulty": "標準",
        "question": "企業のAWS環境で「複数AWSアカウントへの人間ユーザーのSSOアクセスを一元管理する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "GuardDuty",
            "IAM Identity Center",
            "WAF",
            "CloudTrail"
        ],
        "answer": 1,
        "explanation": "要件の中心は「複数AWSアカウントへの人間ユーザーのSSOアクセスを一元管理する」です。したがってIAM Identity Centerを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "GuardDutyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。IAM Identity Centerは、複数AWSアカウントへの人間ユーザーのSSOアクセスを一元管理するための選択肢です。",
            "WAFは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "CloudTrailは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "IAM Identity Center",
            "GuardDuty",
            "WAF",
            "CloudTrail"
        ]
    },
    {
        "id": "q017",
        "category": "IAM / Security",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「複数AWSアカウントへの人間ユーザーのSSOアクセスを一元管理する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "WAF",
            "GuardDuty",
            "IAM Identity Center",
            "KMS"
        ],
        "answer": 2,
        "explanation": "要件の中心は「複数AWSアカウントへの人間ユーザーのSSOアクセスを一元管理する」です。したがってIAM Identity Centerを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "WAFは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "GuardDutyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。IAM Identity Centerは、複数AWSアカウントへの人間ユーザーのSSOアクセスを一元管理するための選択肢です。",
            "KMSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "IAM Identity Center",
            "WAF",
            "GuardDuty",
            "KMS"
        ]
    },
    {
        "id": "q018",
        "category": "IAM / Security",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「複数AWSアカウントへの人間ユーザーのSSOアクセスを一元管理する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "KMS",
            "IAM Identity Center",
            "WAF",
            "Secrets Manager"
        ],
        "answer": 1,
        "explanation": "要件の中心は「複数AWSアカウントへの人間ユーザーのSSOアクセスを一元管理する」です。したがってIAM Identity Centerを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "KMSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。IAM Identity Centerは、複数AWSアカウントへの人間ユーザーのSSOアクセスを一元管理するための選択肢です。",
            "WAFは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Secrets Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "IAM Identity Center",
            "KMS",
            "WAF",
            "Secrets Manager"
        ]
    },
    {
        "id": "q019",
        "category": "IAM / Security",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「複数AWSアカウントへの人間ユーザーのSSOアクセスを一元管理する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "IAM Identity Center",
            "Secrets Manager",
            "KMS",
            "Security Group"
        ],
        "answer": 0,
        "explanation": "要件の中心は「複数AWSアカウントへの人間ユーザーのSSOアクセスを一元管理する」です。したがってIAM Identity Centerを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。IAM Identity Centerは、複数AWSアカウントへの人間ユーザーのSSOアクセスを一元管理するための選択肢です。",
            "Secrets Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "KMSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "IAM Identity Center",
            "Secrets Manager",
            "KMS",
            "Security Group"
        ]
    },
    {
        "id": "q020",
        "category": "IAM / Security",
        "difficulty": "やや難",
        "question": "設計レビューで「複数AWSアカウントへの人間ユーザーのSSOアクセスを一元管理する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Route 53",
            "Security Group",
            "Secrets Manager",
            "IAM Identity Center"
        ],
        "answer": 3,
        "explanation": "要件の中心は「複数AWSアカウントへの人間ユーザーのSSOアクセスを一元管理する」です。したがってIAM Identity Centerを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Secrets Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。IAM Identity Centerは、複数AWSアカウントへの人間ユーザーのSSOアクセスを一元管理するための選択肢です。"
        ],
        "services": [
            "IAM Identity Center",
            "Route 53",
            "Security Group",
            "Secrets Manager"
        ]
    },
    {
        "id": "q021",
        "category": "IAM / Security",
        "difficulty": "標準",
        "question": "企業のAWS環境で「IAMロールを引き受けるなどして一時的な認証情報を発行する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "KMS",
            "STS",
            "Security Group",
            "Secrets Manager"
        ],
        "answer": 1,
        "explanation": "要件の中心は「IAMロールを引き受けるなどして一時的な認証情報を発行する」です。したがってSTSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "KMSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。STSは、IAMロールを引き受けるなどして一時的な認証情報を発行するための選択肢です。",
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Secrets Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "STS",
            "KMS",
            "Security Group",
            "Secrets Manager"
        ]
    },
    {
        "id": "q022",
        "category": "IAM / Security",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「IAMロールを引き受けるなどして一時的な認証情報を発行する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Secrets Manager",
            "Security Group",
            "Route 53",
            "STS"
        ],
        "answer": 3,
        "explanation": "要件の中心は「IAMロールを引き受けるなどして一時的な認証情報を発行する」です。したがってSTSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Secrets Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。STSは、IAMロールを引き受けるなどして一時的な認証情報を発行するための選択肢です。"
        ],
        "services": [
            "STS",
            "Secrets Manager",
            "Security Group",
            "Route 53"
        ]
    },
    {
        "id": "q023",
        "category": "IAM / Security",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「IAMロールを引き受けるなどして一時的な認証情報を発行する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Security Group",
            "Route 53",
            "CloudWatch",
            "STS"
        ],
        "answer": 3,
        "explanation": "要件の中心は「IAMロールを引き受けるなどして一時的な認証情報を発行する」です。したがってSTSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "CloudWatchは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。STSは、IAMロールを引き受けるなどして一時的な認証情報を発行するための選択肢です。"
        ],
        "services": [
            "STS",
            "Security Group",
            "Route 53",
            "CloudWatch"
        ]
    },
    {
        "id": "q024",
        "category": "IAM / Security",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「IAMロールを引き受けるなどして一時的な認証情報を発行する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "CloudTrail",
            "STS",
            "Route 53",
            "CloudWatch"
        ],
        "answer": 1,
        "explanation": "要件の中心は「IAMロールを引き受けるなどして一時的な認証情報を発行する」です。したがってSTSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "CloudTrailは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。STSは、IAMロールを引き受けるなどして一時的な認証情報を発行するための選択肢です。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "CloudWatchは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "STS",
            "CloudTrail",
            "Route 53",
            "CloudWatch"
        ]
    },
    {
        "id": "q025",
        "category": "IAM / Security",
        "difficulty": "やや難",
        "question": "設計レビューで「IAMロールを引き受けるなどして一時的な認証情報を発行する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "GuardDuty",
            "CloudWatch",
            "STS",
            "CloudTrail"
        ],
        "answer": 2,
        "explanation": "要件の中心は「IAMロールを引き受けるなどして一時的な認証情報を発行する」です。したがってSTSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "GuardDutyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "CloudWatchは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。STSは、IAMロールを引き受けるなどして一時的な認証情報を発行するための選択肢です。",
            "CloudTrailは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "STS",
            "GuardDuty",
            "CloudWatch",
            "CloudTrail"
        ]
    },
    {
        "id": "q026",
        "category": "IAM / Security",
        "difficulty": "標準",
        "question": "企業のAWS環境で「AWSサービスやアプリケーションの暗号化キーを作成・管理する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "WAF",
            "CloudTrail",
            "KMS",
            "GuardDuty"
        ],
        "answer": 2,
        "explanation": "要件の中心は「AWSサービスやアプリケーションの暗号化キーを作成・管理する」です。したがってKMSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "WAFは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "CloudTrailは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。KMSは、AWSサービスやアプリケーションの暗号化キーを作成・管理するための選択肢です。",
            "GuardDutyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "KMS",
            "WAF",
            "CloudTrail",
            "GuardDuty"
        ]
    },
    {
        "id": "q027",
        "category": "IAM / Security",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「AWSサービスやアプリケーションの暗号化キーを作成・管理する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "WAF",
            "GuardDuty",
            "KMS",
            "Secrets Manager"
        ],
        "answer": 2,
        "explanation": "要件の中心は「AWSサービスやアプリケーションの暗号化キーを作成・管理する」です。したがってKMSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "WAFは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "GuardDutyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。KMSは、AWSサービスやアプリケーションの暗号化キーを作成・管理するための選択肢です。",
            "Secrets Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "KMS",
            "WAF",
            "GuardDuty",
            "Secrets Manager"
        ]
    },
    {
        "id": "q028",
        "category": "IAM / Security",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「AWSサービスやアプリケーションの暗号化キーを作成・管理する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Secrets Manager",
            "Security Group",
            "KMS",
            "WAF"
        ],
        "answer": 2,
        "explanation": "要件の中心は「AWSサービスやアプリケーションの暗号化キーを作成・管理する」です。したがってKMSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Secrets Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。KMSは、AWSサービスやアプリケーションの暗号化キーを作成・管理するための選択肢です。",
            "WAFは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "KMS",
            "Secrets Manager",
            "Security Group",
            "WAF"
        ]
    },
    {
        "id": "q029",
        "category": "IAM / Security",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「AWSサービスやアプリケーションの暗号化キーを作成・管理する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Security Group",
            "Secrets Manager",
            "KMS",
            "Route 53"
        ],
        "answer": 2,
        "explanation": "要件の中心は「AWSサービスやアプリケーションの暗号化キーを作成・管理する」です。したがってKMSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Secrets Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。KMSは、AWSサービスやアプリケーションの暗号化キーを作成・管理するための選択肢です。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "KMS",
            "Security Group",
            "Secrets Manager",
            "Route 53"
        ]
    },
    {
        "id": "q030",
        "category": "IAM / Security",
        "difficulty": "やや難",
        "question": "設計レビューで「AWSサービスやアプリケーションの暗号化キーを作成・管理する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Security Group",
            "CloudWatch",
            "Route 53",
            "KMS"
        ],
        "answer": 3,
        "explanation": "要件の中心は「AWSサービスやアプリケーションの暗号化キーを作成・管理する」です。したがってKMSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "CloudWatchは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。KMSは、AWSサービスやアプリケーションの暗号化キーを作成・管理するための選択肢です。"
        ],
        "services": [
            "KMS",
            "Security Group",
            "CloudWatch",
            "Route 53"
        ]
    },
    {
        "id": "q031",
        "category": "IAM / Security",
        "difficulty": "標準",
        "question": "企業のAWS環境で「DBパスワードなどの機密情報を安全に保存しローテーションする」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Secrets Manager",
            "Route 53",
            "KMS",
            "Security Group"
        ],
        "answer": 0,
        "explanation": "要件の中心は「DBパスワードなどの機密情報を安全に保存しローテーションする」です。したがってSecrets Managerを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Secrets Managerは、DBパスワードなどの機密情報を安全に保存しローテーションするための選択肢です。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "KMSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Secrets Manager",
            "Route 53",
            "KMS",
            "Security Group"
        ]
    },
    {
        "id": "q032",
        "category": "IAM / Security",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「DBパスワードなどの機密情報を安全に保存しローテーションする」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Route 53",
            "Secrets Manager",
            "Security Group",
            "CloudWatch"
        ],
        "answer": 1,
        "explanation": "要件の中心は「DBパスワードなどの機密情報を安全に保存しローテーションする」です。したがってSecrets Managerを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Secrets Managerは、DBパスワードなどの機密情報を安全に保存しローテーションするための選択肢です。",
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "CloudWatchは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Secrets Manager",
            "Route 53",
            "Security Group",
            "CloudWatch"
        ]
    },
    {
        "id": "q033",
        "category": "IAM / Security",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「DBパスワードなどの機密情報を安全に保存しローテーションする」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "CloudTrail",
            "Secrets Manager",
            "CloudWatch",
            "Route 53"
        ],
        "answer": 1,
        "explanation": "要件の中心は「DBパスワードなどの機密情報を安全に保存しローテーションする」です。したがってSecrets Managerを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "CloudTrailは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Secrets Managerは、DBパスワードなどの機密情報を安全に保存しローテーションするための選択肢です。",
            "CloudWatchは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Secrets Manager",
            "CloudTrail",
            "CloudWatch",
            "Route 53"
        ]
    },
    {
        "id": "q034",
        "category": "IAM / Security",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「DBパスワードなどの機密情報を安全に保存しローテーションする」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "GuardDuty",
            "CloudTrail",
            "Secrets Manager",
            "CloudWatch"
        ],
        "answer": 2,
        "explanation": "要件の中心は「DBパスワードなどの機密情報を安全に保存しローテーションする」です。したがってSecrets Managerを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "GuardDutyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "CloudTrailは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Secrets Managerは、DBパスワードなどの機密情報を安全に保存しローテーションするための選択肢です。",
            "CloudWatchは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Secrets Manager",
            "GuardDuty",
            "CloudTrail",
            "CloudWatch"
        ]
    },
    {
        "id": "q035",
        "category": "IAM / Security",
        "difficulty": "やや難",
        "question": "設計レビューで「DBパスワードなどの機密情報を安全に保存しローテーションする」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Secrets Manager",
            "GuardDuty",
            "WAF",
            "CloudTrail"
        ],
        "answer": 0,
        "explanation": "要件の中心は「DBパスワードなどの機密情報を安全に保存しローテーションする」です。したがってSecrets Managerを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Secrets Managerは、DBパスワードなどの機密情報を安全に保存しローテーションするための選択肢です。",
            "GuardDutyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "WAFは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "CloudTrailは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Secrets Manager",
            "GuardDuty",
            "WAF",
            "CloudTrail"
        ]
    },
    {
        "id": "q036",
        "category": "IAM / Security",
        "difficulty": "標準",
        "question": "企業のAWS環境で「AWS API操作の監査ログを記録し誰が何をしたか追跡する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "WAF",
            "CloudTrail",
            "GuardDuty",
            "CloudWatch"
        ],
        "answer": 1,
        "explanation": "要件の中心は「AWS API操作の監査ログを記録し誰が何をしたか追跡する」です。したがってCloudTrailを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "WAFは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。CloudTrailは、AWS API操作の監査ログを記録し誰が何をしたか追跡するための選択肢です。",
            "GuardDutyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "CloudWatchは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "CloudTrail",
            "WAF",
            "GuardDuty",
            "CloudWatch"
        ]
    },
    {
        "id": "q037",
        "category": "IAM / Security",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「AWS API操作の監査ログを記録し誰が何をしたか追跡する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "WAF",
            "GuardDuty",
            "KMS",
            "CloudTrail"
        ],
        "answer": 3,
        "explanation": "要件の中心は「AWS API操作の監査ログを記録し誰が何をしたか追跡する」です。したがってCloudTrailを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "WAFは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "GuardDutyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "KMSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。CloudTrailは、AWS API操作の監査ログを記録し誰が何をしたか追跡するための選択肢です。"
        ],
        "services": [
            "CloudTrail",
            "WAF",
            "GuardDuty",
            "KMS"
        ]
    },
    {
        "id": "q038",
        "category": "IAM / Security",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「AWS API操作の監査ログを記録し誰が何をしたか追跡する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "KMS",
            "Secrets Manager",
            "WAF",
            "CloudTrail"
        ],
        "answer": 3,
        "explanation": "要件の中心は「AWS API操作の監査ログを記録し誰が何をしたか追跡する」です。したがってCloudTrailを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "KMSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Secrets Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "WAFは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。CloudTrailは、AWS API操作の監査ログを記録し誰が何をしたか追跡するための選択肢です。"
        ],
        "services": [
            "CloudTrail",
            "KMS",
            "Secrets Manager",
            "WAF"
        ]
    },
    {
        "id": "q039",
        "category": "IAM / Security",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「AWS API操作の監査ログを記録し誰が何をしたか追跡する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Secrets Manager",
            "KMS",
            "Security Group",
            "CloudTrail"
        ],
        "answer": 3,
        "explanation": "要件の中心は「AWS API操作の監査ログを記録し誰が何をしたか追跡する」です。したがってCloudTrailを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Secrets Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "KMSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。CloudTrailは、AWS API操作の監査ログを記録し誰が何をしたか追跡するための選択肢です。"
        ],
        "services": [
            "CloudTrail",
            "Secrets Manager",
            "KMS",
            "Security Group"
        ]
    },
    {
        "id": "q040",
        "category": "IAM / Security",
        "difficulty": "やや難",
        "question": "設計レビューで「AWS API操作の監査ログを記録し誰が何をしたか追跡する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "CloudTrail",
            "Security Group",
            "Secrets Manager",
            "Route 53"
        ],
        "answer": 0,
        "explanation": "要件の中心は「AWS API操作の監査ログを記録し誰が何をしたか追跡する」です。したがってCloudTrailを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。CloudTrailは、AWS API操作の監査ログを記録し誰が何をしたか追跡するための選択肢です。",
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Secrets Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "CloudTrail",
            "Security Group",
            "Secrets Manager",
            "Route 53"
        ]
    },
    {
        "id": "q041",
        "category": "IAM / Security",
        "difficulty": "標準",
        "question": "企業のAWS環境で「AWS環境のログやイベントを分析して脅威や不審な活動を検知する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Secrets Manager",
            "GuardDuty",
            "Security Group",
            "KMS"
        ],
        "answer": 1,
        "explanation": "要件の中心は「AWS環境のログやイベントを分析して脅威や不審な活動を検知する」です。したがってGuardDutyを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Secrets Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。GuardDutyは、AWS環境のログやイベントを分析して脅威や不審な活動を検知するための選択肢です。",
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "KMSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "GuardDuty",
            "Secrets Manager",
            "Security Group",
            "KMS"
        ]
    },
    {
        "id": "q042",
        "category": "IAM / Security",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「AWS環境のログやイベントを分析して脅威や不審な活動を検知する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Route 53",
            "Secrets Manager",
            "Security Group",
            "GuardDuty"
        ],
        "answer": 3,
        "explanation": "要件の中心は「AWS環境のログやイベントを分析して脅威や不審な活動を検知する」です。したがってGuardDutyを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Secrets Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。GuardDutyは、AWS環境のログやイベントを分析して脅威や不審な活動を検知するための選択肢です。"
        ],
        "services": [
            "GuardDuty",
            "Route 53",
            "Secrets Manager",
            "Security Group"
        ]
    },
    {
        "id": "q043",
        "category": "IAM / Security",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「AWS環境のログやイベントを分析して脅威や不審な活動を検知する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Route 53",
            "GuardDuty",
            "Security Group",
            "CloudWatch"
        ],
        "answer": 1,
        "explanation": "要件の中心は「AWS環境のログやイベントを分析して脅威や不審な活動を検知する」です。したがってGuardDutyを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。GuardDutyは、AWS環境のログやイベントを分析して脅威や不審な活動を検知するための選択肢です。",
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "CloudWatchは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "GuardDuty",
            "Route 53",
            "Security Group",
            "CloudWatch"
        ]
    },
    {
        "id": "q044",
        "category": "IAM / Security",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「AWS環境のログやイベントを分析して脅威や不審な活動を検知する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "CloudTrail",
            "GuardDuty",
            "CloudWatch",
            "Route 53"
        ],
        "answer": 1,
        "explanation": "要件の中心は「AWS環境のログやイベントを分析して脅威や不審な活動を検知する」です。したがってGuardDutyを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "CloudTrailは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。GuardDutyは、AWS環境のログやイベントを分析して脅威や不審な活動を検知するための選択肢です。",
            "CloudWatchは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "GuardDuty",
            "CloudTrail",
            "CloudWatch",
            "Route 53"
        ]
    },
    {
        "id": "q045",
        "category": "IAM / Security",
        "difficulty": "やや難",
        "question": "設計レビューで「AWS環境のログやイベントを分析して脅威や不審な活動を検知する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "CloudTrail",
            "CloudWatch",
            "GuardDuty",
            "WAF"
        ],
        "answer": 2,
        "explanation": "要件の中心は「AWS環境のログやイベントを分析して脅威や不審な活動を検知する」です。したがってGuardDutyを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "CloudTrailは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "CloudWatchは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。GuardDutyは、AWS環境のログやイベントを分析して脅威や不審な活動を検知するための選択肢です。",
            "WAFは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "GuardDuty",
            "CloudTrail",
            "CloudWatch",
            "WAF"
        ]
    },
    {
        "id": "q046",
        "category": "IAM / Security",
        "difficulty": "標準",
        "question": "企業のAWS環境で「HTTP/HTTPSリクエストをルールで検査しWeb攻撃からアプリケーションを保護する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "WAF",
            "CloudTrail",
            "CloudWatch",
            "Route 53"
        ],
        "answer": 0,
        "explanation": "要件の中心は「HTTP/HTTPSリクエストをルールで検査しWeb攻撃からアプリケーションを保護する」です。したがってWAFを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。WAFは、HTTP/HTTPSリクエストをルールで検査しWeb攻撃からアプリケーションを保護するための選択肢です。",
            "CloudTrailは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "CloudWatchは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "WAF",
            "CloudTrail",
            "CloudWatch",
            "Route 53"
        ]
    },
    {
        "id": "q047",
        "category": "IAM / Security",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「HTTP/HTTPSリクエストをルールで検査しWeb攻撃からアプリケーションを保護する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "CloudWatch",
            "GuardDuty",
            "CloudTrail",
            "WAF"
        ],
        "answer": 3,
        "explanation": "要件の中心は「HTTP/HTTPSリクエストをルールで検査しWeb攻撃からアプリケーションを保護する」です。したがってWAFを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "CloudWatchは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "GuardDutyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "CloudTrailは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。WAFは、HTTP/HTTPSリクエストをルールで検査しWeb攻撃からアプリケーションを保護するための選択肢です。"
        ],
        "services": [
            "WAF",
            "CloudWatch",
            "GuardDuty",
            "CloudTrail"
        ]
    },
    {
        "id": "q048",
        "category": "IAM / Security",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「HTTP/HTTPSリクエストをルールで検査しWeb攻撃からアプリケーションを保護する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "KMS",
            "GuardDuty",
            "CloudTrail",
            "WAF"
        ],
        "answer": 3,
        "explanation": "要件の中心は「HTTP/HTTPSリクエストをルールで検査しWeb攻撃からアプリケーションを保護する」です。したがってWAFを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "KMSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "GuardDutyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "CloudTrailは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。WAFは、HTTP/HTTPSリクエストをルールで検査しWeb攻撃からアプリケーションを保護するための選択肢です。"
        ],
        "services": [
            "WAF",
            "KMS",
            "GuardDuty",
            "CloudTrail"
        ]
    },
    {
        "id": "q049",
        "category": "IAM / Security",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「HTTP/HTTPSリクエストをルールで検査しWeb攻撃からアプリケーションを保護する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "KMS",
            "WAF",
            "GuardDuty",
            "Secrets Manager"
        ],
        "answer": 1,
        "explanation": "要件の中心は「HTTP/HTTPSリクエストをルールで検査しWeb攻撃からアプリケーションを保護する」です。したがってWAFを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "KMSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。WAFは、HTTP/HTTPSリクエストをルールで検査しWeb攻撃からアプリケーションを保護するための選択肢です。",
            "GuardDutyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Secrets Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "WAF",
            "KMS",
            "GuardDuty",
            "Secrets Manager"
        ]
    },
    {
        "id": "q050",
        "category": "IAM / Security",
        "difficulty": "やや難",
        "question": "設計レビューで「HTTP/HTTPSリクエストをルールで検査しWeb攻撃からアプリケーションを保護する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "KMS",
            "WAF",
            "Security Group",
            "Secrets Manager"
        ],
        "answer": 1,
        "explanation": "要件の中心は「HTTP/HTTPSリクエストをルールで検査しWeb攻撃からアプリケーションを保護する」です。したがってWAFを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "KMSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。WAFは、HTTP/HTTPSリクエストをルールで検査しWeb攻撃からアプリケーションを保護するための選択肢です。",
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Secrets Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "WAF",
            "KMS",
            "Security Group",
            "Secrets Manager"
        ]
    },
    {
        "id": "q051",
        "category": "VPC / Networking",
        "difficulty": "標準",
        "question": "企業のAWS環境で「論理的に分離されたAWSネットワークを構築する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "NAT Gateway",
            "Internet Gateway",
            "VPC",
            "VPC Endpoint"
        ],
        "answer": 2,
        "explanation": "要件の中心は「論理的に分離されたAWSネットワークを構築する」です。したがってVPCを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "NAT Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Internet Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。VPCは、論理的に分離されたAWSネットワークを構築するための選択肢です。",
            "VPC Endpointは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "VPC",
            "NAT Gateway",
            "Internet Gateway",
            "VPC Endpoint"
        ]
    },
    {
        "id": "q052",
        "category": "VPC / Networking",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「論理的に分離されたAWSネットワークを構築する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "VPC Peering",
            "VPC Endpoint",
            "VPC",
            "NAT Gateway"
        ],
        "answer": 2,
        "explanation": "要件の中心は「論理的に分離されたAWSネットワークを構築する」です。したがってVPCを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "VPC Peeringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "VPC Endpointは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。VPCは、論理的に分離されたAWSネットワークを構築するための選択肢です。",
            "NAT Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "VPC",
            "VPC Peering",
            "VPC Endpoint",
            "NAT Gateway"
        ]
    },
    {
        "id": "q053",
        "category": "VPC / Networking",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「論理的に分離されたAWSネットワークを構築する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Transit Gateway",
            "VPC",
            "VPC Endpoint",
            "VPC Peering"
        ],
        "answer": 1,
        "explanation": "要件の中心は「論理的に分離されたAWSネットワークを構築する」です。したがってVPCを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Transit Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。VPCは、論理的に分離されたAWSネットワークを構築するための選択肢です。",
            "VPC Endpointは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "VPC Peeringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "VPC",
            "Transit Gateway",
            "VPC Endpoint",
            "VPC Peering"
        ]
    },
    {
        "id": "q054",
        "category": "VPC / Networking",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「論理的に分離されたAWSネットワークを構築する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "VPC Peering",
            "Transit Gateway",
            "VPC",
            "Site-to-Site VPN"
        ],
        "answer": 2,
        "explanation": "要件の中心は「論理的に分離されたAWSネットワークを構築する」です。したがってVPCを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "VPC Peeringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Transit Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。VPCは、論理的に分離されたAWSネットワークを構築するための選択肢です。",
            "Site-to-Site VPNは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "VPC",
            "VPC Peering",
            "Transit Gateway",
            "Site-to-Site VPN"
        ]
    },
    {
        "id": "q055",
        "category": "VPC / Networking",
        "difficulty": "やや難",
        "question": "設計レビューで「論理的に分離されたAWSネットワークを構築する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Site-to-Site VPN",
            "Transit Gateway",
            "VPC",
            "Direct Connect"
        ],
        "answer": 2,
        "explanation": "要件の中心は「論理的に分離されたAWSネットワークを構築する」です。したがってVPCを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Site-to-Site VPNは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Transit Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。VPCは、論理的に分離されたAWSネットワークを構築するための選択肢です。",
            "Direct Connectは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "VPC",
            "Site-to-Site VPN",
            "Transit Gateway",
            "Direct Connect"
        ]
    },
    {
        "id": "q056",
        "category": "VPC / Networking",
        "difficulty": "標準",
        "question": "企業のAWS環境で「VPC内のリソースとインターネット間の通信経路を提供する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Internet Gateway",
            "Direct Connect",
            "Site-to-Site VPN",
            "Transit Gateway"
        ],
        "answer": 0,
        "explanation": "要件の中心は「VPC内のリソースとインターネット間の通信経路を提供する」です。したがってInternet Gatewayを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Internet Gatewayは、VPC内のリソースとインターネット間の通信経路を提供するための選択肢です。",
            "Direct Connectは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Site-to-Site VPNは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Transit Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Internet Gateway",
            "Direct Connect",
            "Site-to-Site VPN",
            "Transit Gateway"
        ]
    },
    {
        "id": "q057",
        "category": "VPC / Networking",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「VPC内のリソースとインターネット間の通信経路を提供する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Security Group",
            "Internet Gateway",
            "Direct Connect",
            "Site-to-Site VPN"
        ],
        "answer": 1,
        "explanation": "要件の中心は「VPC内のリソースとインターネット間の通信経路を提供する」です。したがってInternet Gatewayを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Internet Gatewayは、VPC内のリソースとインターネット間の通信経路を提供するための選択肢です。",
            "Direct Connectは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Site-to-Site VPNは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Internet Gateway",
            "Security Group",
            "Direct Connect",
            "Site-to-Site VPN"
        ]
    },
    {
        "id": "q058",
        "category": "VPC / Networking",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「VPC内のリソースとインターネット間の通信経路を提供する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Security Group",
            "Internet Gateway",
            "Direct Connect",
            "Network ACL"
        ],
        "answer": 1,
        "explanation": "要件の中心は「VPC内のリソースとインターネット間の通信経路を提供する」です。したがってInternet Gatewayを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Internet Gatewayは、VPC内のリソースとインターネット間の通信経路を提供するための選択肢です。",
            "Direct Connectは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Network ACLは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Internet Gateway",
            "Security Group",
            "Direct Connect",
            "Network ACL"
        ]
    },
    {
        "id": "q059",
        "category": "VPC / Networking",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「VPC内のリソースとインターネット間の通信経路を提供する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Network ACL",
            "Route 53",
            "Internet Gateway",
            "Security Group"
        ],
        "answer": 2,
        "explanation": "要件の中心は「VPC内のリソースとインターネット間の通信経路を提供する」です。したがってInternet Gatewayを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Network ACLは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Internet Gatewayは、VPC内のリソースとインターネット間の通信経路を提供するための選択肢です。",
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Internet Gateway",
            "Network ACL",
            "Route 53",
            "Security Group"
        ]
    },
    {
        "id": "q060",
        "category": "VPC / Networking",
        "difficulty": "やや難",
        "question": "設計レビューで「VPC内のリソースとインターネット間の通信経路を提供する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Route 53",
            "NAT Gateway",
            "Network ACL",
            "Internet Gateway"
        ],
        "answer": 3,
        "explanation": "要件の中心は「VPC内のリソースとインターネット間の通信経路を提供する」です。したがってInternet Gatewayを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "NAT Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Network ACLは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Internet Gatewayは、VPC内のリソースとインターネット間の通信経路を提供するための選択肢です。"
        ],
        "services": [
            "Internet Gateway",
            "Route 53",
            "NAT Gateway",
            "Network ACL"
        ]
    },
    {
        "id": "q061",
        "category": "VPC / Networking",
        "difficulty": "標準",
        "question": "企業のAWS環境で「プライベートサブネットのリソースから外部へアウトバウンド通信させる」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "NAT Gateway",
            "Network ACL",
            "Security Group",
            "Route 53"
        ],
        "answer": 0,
        "explanation": "要件の中心は「プライベートサブネットのリソースから外部へアウトバウンド通信させる」です。したがってNAT Gatewayを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。NAT Gatewayは、プライベートサブネットのリソースから外部へアウトバウンド通信させるための選択肢です。",
            "Network ACLは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "NAT Gateway",
            "Network ACL",
            "Security Group",
            "Route 53"
        ]
    },
    {
        "id": "q062",
        "category": "VPC / Networking",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「プライベートサブネットのリソースから外部へアウトバウンド通信させる」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Internet Gateway",
            "Route 53",
            "NAT Gateway",
            "Network ACL"
        ],
        "answer": 2,
        "explanation": "要件の中心は「プライベートサブネットのリソースから外部へアウトバウンド通信させる」です。したがってNAT Gatewayを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Internet Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。NAT Gatewayは、プライベートサブネットのリソースから外部へアウトバウンド通信させるための選択肢です。",
            "Network ACLは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "NAT Gateway",
            "Internet Gateway",
            "Route 53",
            "Network ACL"
        ]
    },
    {
        "id": "q063",
        "category": "VPC / Networking",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「プライベートサブネットのリソースから外部へアウトバウンド通信させる」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "NAT Gateway",
            "VPC Endpoint",
            "Route 53",
            "Internet Gateway"
        ],
        "answer": 0,
        "explanation": "要件の中心は「プライベートサブネットのリソースから外部へアウトバウンド通信させる」です。したがってNAT Gatewayを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。NAT Gatewayは、プライベートサブネットのリソースから外部へアウトバウンド通信させるための選択肢です。",
            "VPC Endpointは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Internet Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "NAT Gateway",
            "VPC Endpoint",
            "Route 53",
            "Internet Gateway"
        ]
    },
    {
        "id": "q064",
        "category": "VPC / Networking",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「プライベートサブネットのリソースから外部へアウトバウンド通信させる」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "NAT Gateway",
            "VPC Endpoint",
            "VPC Peering",
            "Internet Gateway"
        ],
        "answer": 0,
        "explanation": "要件の中心は「プライベートサブネットのリソースから外部へアウトバウンド通信させる」です。したがってNAT Gatewayを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。NAT Gatewayは、プライベートサブネットのリソースから外部へアウトバウンド通信させるための選択肢です。",
            "VPC Endpointは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "VPC Peeringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Internet Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "NAT Gateway",
            "VPC Endpoint",
            "VPC Peering",
            "Internet Gateway"
        ]
    },
    {
        "id": "q065",
        "category": "VPC / Networking",
        "difficulty": "やや難",
        "question": "設計レビューで「プライベートサブネットのリソースから外部へアウトバウンド通信させる」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "NAT Gateway",
            "VPC Endpoint",
            "Transit Gateway",
            "VPC Peering"
        ],
        "answer": 0,
        "explanation": "要件の中心は「プライベートサブネットのリソースから外部へアウトバウンド通信させる」です。したがってNAT Gatewayを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。NAT Gatewayは、プライベートサブネットのリソースから外部へアウトバウンド通信させるための選択肢です。",
            "VPC Endpointは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Transit Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "VPC Peeringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "NAT Gateway",
            "VPC Endpoint",
            "Transit Gateway",
            "VPC Peering"
        ]
    },
    {
        "id": "q066",
        "category": "VPC / Networking",
        "difficulty": "標準",
        "question": "企業のAWS環境で「VPCからAWSサービスへインターネットを経由せずプライベートに接続する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Internet Gateway",
            "VPC Endpoint",
            "NAT Gateway",
            "VPC Peering"
        ],
        "answer": 1,
        "explanation": "要件の中心は「VPCからAWSサービスへインターネットを経由せずプライベートに接続する」です。したがってVPC Endpointを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Internet Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。VPC Endpointは、VPCからAWSサービスへインターネットを経由せずプライベートに接続するための選択肢です。",
            "NAT Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "VPC Peeringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "VPC Endpoint",
            "Internet Gateway",
            "NAT Gateway",
            "VPC Peering"
        ]
    },
    {
        "id": "q067",
        "category": "VPC / Networking",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「VPCからAWSサービスへインターネットを経由せずプライベートに接続する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Transit Gateway",
            "NAT Gateway",
            "VPC Endpoint",
            "VPC Peering"
        ],
        "answer": 2,
        "explanation": "要件の中心は「VPCからAWSサービスへインターネットを経由せずプライベートに接続する」です。したがってVPC Endpointを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Transit Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "NAT Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。VPC Endpointは、VPCからAWSサービスへインターネットを経由せずプライベートに接続するための選択肢です。",
            "VPC Peeringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "VPC Endpoint",
            "Transit Gateway",
            "NAT Gateway",
            "VPC Peering"
        ]
    },
    {
        "id": "q068",
        "category": "VPC / Networking",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「VPCからAWSサービスへインターネットを経由せずプライベートに接続する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "VPC Endpoint",
            "Transit Gateway",
            "VPC Peering",
            "Site-to-Site VPN"
        ],
        "answer": 0,
        "explanation": "要件の中心は「VPCからAWSサービスへインターネットを経由せずプライベートに接続する」です。したがってVPC Endpointを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。VPC Endpointは、VPCからAWSサービスへインターネットを経由せずプライベートに接続するための選択肢です。",
            "Transit Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "VPC Peeringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Site-to-Site VPNは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "VPC Endpoint",
            "Transit Gateway",
            "VPC Peering",
            "Site-to-Site VPN"
        ]
    },
    {
        "id": "q069",
        "category": "VPC / Networking",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「VPCからAWSサービスへインターネットを経由せずプライベートに接続する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Site-to-Site VPN",
            "Transit Gateway",
            "VPC Endpoint",
            "Direct Connect"
        ],
        "answer": 2,
        "explanation": "要件の中心は「VPCからAWSサービスへインターネットを経由せずプライベートに接続する」です。したがってVPC Endpointを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Site-to-Site VPNは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Transit Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。VPC Endpointは、VPCからAWSサービスへインターネットを経由せずプライベートに接続するための選択肢です。",
            "Direct Connectは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "VPC Endpoint",
            "Site-to-Site VPN",
            "Transit Gateway",
            "Direct Connect"
        ]
    },
    {
        "id": "q070",
        "category": "VPC / Networking",
        "difficulty": "やや難",
        "question": "設計レビューで「VPCからAWSサービスへインターネットを経由せずプライベートに接続する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Direct Connect",
            "VPC Endpoint",
            "Site-to-Site VPN",
            "Security Group"
        ],
        "answer": 1,
        "explanation": "要件の中心は「VPCからAWSサービスへインターネットを経由せずプライベートに接続する」です。したがってVPC Endpointを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Direct Connectは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。VPC Endpointは、VPCからAWSサービスへインターネットを経由せずプライベートに接続するための選択肢です。",
            "Site-to-Site VPNは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "VPC Endpoint",
            "Direct Connect",
            "Site-to-Site VPN",
            "Security Group"
        ]
    },
    {
        "id": "q071",
        "category": "VPC / Networking",
        "difficulty": "標準",
        "question": "企業のAWS環境で「2つのVPC間でプライベートIPによる通信を行う」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Site-to-Site VPN",
            "Transit Gateway",
            "VPC Peering",
            "Direct Connect"
        ],
        "answer": 2,
        "explanation": "要件の中心は「2つのVPC間でプライベートIPによる通信を行う」です。したがってVPC Peeringを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Site-to-Site VPNは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Transit Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。VPC Peeringは、2つのVPC間でプライベートIPによる通信を行うための選択肢です。",
            "Direct Connectは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "VPC Peering",
            "Site-to-Site VPN",
            "Transit Gateway",
            "Direct Connect"
        ]
    },
    {
        "id": "q072",
        "category": "VPC / Networking",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「2つのVPC間でプライベートIPによる通信を行う」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Direct Connect",
            "Site-to-Site VPN",
            "Security Group",
            "VPC Peering"
        ],
        "answer": 3,
        "explanation": "要件の中心は「2つのVPC間でプライベートIPによる通信を行う」です。したがってVPC Peeringを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Direct Connectは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Site-to-Site VPNは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。VPC Peeringは、2つのVPC間でプライベートIPによる通信を行うための選択肢です。"
        ],
        "services": [
            "VPC Peering",
            "Direct Connect",
            "Site-to-Site VPN",
            "Security Group"
        ]
    },
    {
        "id": "q073",
        "category": "VPC / Networking",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「2つのVPC間でプライベートIPによる通信を行う」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "VPC Peering",
            "Security Group",
            "Network ACL",
            "Direct Connect"
        ],
        "answer": 0,
        "explanation": "要件の中心は「2つのVPC間でプライベートIPによる通信を行う」です。したがってVPC Peeringを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。VPC Peeringは、2つのVPC間でプライベートIPによる通信を行うための選択肢です。",
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Network ACLは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Direct Connectは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "VPC Peering",
            "Security Group",
            "Network ACL",
            "Direct Connect"
        ]
    },
    {
        "id": "q074",
        "category": "VPC / Networking",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「2つのVPC間でプライベートIPによる通信を行う」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "VPC Peering",
            "Network ACL",
            "Route 53",
            "Security Group"
        ],
        "answer": 0,
        "explanation": "要件の中心は「2つのVPC間でプライベートIPによる通信を行う」です。したがってVPC Peeringを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。VPC Peeringは、2つのVPC間でプライベートIPによる通信を行うための選択肢です。",
            "Network ACLは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "VPC Peering",
            "Network ACL",
            "Route 53",
            "Security Group"
        ]
    },
    {
        "id": "q075",
        "category": "VPC / Networking",
        "difficulty": "やや難",
        "question": "設計レビューで「2つのVPC間でプライベートIPによる通信を行う」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Internet Gateway",
            "VPC Peering",
            "Route 53",
            "Network ACL"
        ],
        "answer": 1,
        "explanation": "要件の中心は「2つのVPC間でプライベートIPによる通信を行う」です。したがってVPC Peeringを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Internet Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。VPC Peeringは、2つのVPC間でプライベートIPによる通信を行うための選択肢です。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Network ACLは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "VPC Peering",
            "Internet Gateway",
            "Route 53",
            "Network ACL"
        ]
    },
    {
        "id": "q076",
        "category": "VPC / Networking",
        "difficulty": "標準",
        "question": "企業のAWS環境で「多数のVPCやオンプレミスネットワークをハブ型で接続する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Route 53",
            "Security Group",
            "Transit Gateway",
            "Network ACL"
        ],
        "answer": 2,
        "explanation": "要件の中心は「多数のVPCやオンプレミスネットワークをハブ型で接続する」です。したがってTransit Gatewayを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Transit Gatewayは、多数のVPCやオンプレミスネットワークをハブ型で接続するための選択肢です。",
            "Network ACLは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Transit Gateway",
            "Route 53",
            "Security Group",
            "Network ACL"
        ]
    },
    {
        "id": "q077",
        "category": "VPC / Networking",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「多数のVPCやオンプレミスネットワークをハブ型で接続する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Route 53",
            "Transit Gateway",
            "Network ACL",
            "Internet Gateway"
        ],
        "answer": 1,
        "explanation": "要件の中心は「多数のVPCやオンプレミスネットワークをハブ型で接続する」です。したがってTransit Gatewayを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Transit Gatewayは、多数のVPCやオンプレミスネットワークをハブ型で接続するための選択肢です。",
            "Network ACLは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Internet Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Transit Gateway",
            "Route 53",
            "Network ACL",
            "Internet Gateway"
        ]
    },
    {
        "id": "q078",
        "category": "VPC / Networking",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「多数のVPCやオンプレミスネットワークをハブ型で接続する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Route 53",
            "NAT Gateway",
            "Internet Gateway",
            "Transit Gateway"
        ],
        "answer": 3,
        "explanation": "要件の中心は「多数のVPCやオンプレミスネットワークをハブ型で接続する」です。したがってTransit Gatewayを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "NAT Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Internet Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Transit Gatewayは、多数のVPCやオンプレミスネットワークをハブ型で接続するための選択肢です。"
        ],
        "services": [
            "Transit Gateway",
            "Route 53",
            "NAT Gateway",
            "Internet Gateway"
        ]
    },
    {
        "id": "q079",
        "category": "VPC / Networking",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「多数のVPCやオンプレミスネットワークをハブ型で接続する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Internet Gateway",
            "NAT Gateway",
            "VPC Endpoint",
            "Transit Gateway"
        ],
        "answer": 3,
        "explanation": "要件の中心は「多数のVPCやオンプレミスネットワークをハブ型で接続する」です。したがってTransit Gatewayを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Internet Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "NAT Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "VPC Endpointは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Transit Gatewayは、多数のVPCやオンプレミスネットワークをハブ型で接続するための選択肢です。"
        ],
        "services": [
            "Transit Gateway",
            "Internet Gateway",
            "NAT Gateway",
            "VPC Endpoint"
        ]
    },
    {
        "id": "q080",
        "category": "VPC / Networking",
        "difficulty": "やや難",
        "question": "設計レビューで「多数のVPCやオンプレミスネットワークをハブ型で接続する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Transit Gateway",
            "VPC Endpoint",
            "NAT Gateway",
            "VPC Peering"
        ],
        "answer": 0,
        "explanation": "要件の中心は「多数のVPCやオンプレミスネットワークをハブ型で接続する」です。したがってTransit Gatewayを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Transit Gatewayは、多数のVPCやオンプレミスネットワークをハブ型で接続するための選択肢です。",
            "VPC Endpointは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "NAT Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "VPC Peeringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Transit Gateway",
            "VPC Endpoint",
            "NAT Gateway",
            "VPC Peering"
        ]
    },
    {
        "id": "q081",
        "category": "VPC / Networking",
        "difficulty": "標準",
        "question": "企業のAWS環境で「インターネットを経由してオンプレミスとAWS VPCを暗号化接続する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "VPC Endpoint",
            "Site-to-Site VPN",
            "Internet Gateway",
            "NAT Gateway"
        ],
        "answer": 1,
        "explanation": "要件の中心は「インターネットを経由してオンプレミスとAWS VPCを暗号化接続する」です。したがってSite-to-Site VPNを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "VPC Endpointは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Site-to-Site VPNは、インターネットを経由してオンプレミスとAWS VPCを暗号化接続するための選択肢です。",
            "Internet Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "NAT Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Site-to-Site VPN",
            "VPC Endpoint",
            "Internet Gateway",
            "NAT Gateway"
        ]
    },
    {
        "id": "q082",
        "category": "VPC / Networking",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「インターネットを経由してオンプレミスとAWS VPCを暗号化接続する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Site-to-Site VPN",
            "VPC Endpoint",
            "NAT Gateway",
            "VPC Peering"
        ],
        "answer": 0,
        "explanation": "要件の中心は「インターネットを経由してオンプレミスとAWS VPCを暗号化接続する」です。したがってSite-to-Site VPNを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Site-to-Site VPNは、インターネットを経由してオンプレミスとAWS VPCを暗号化接続するための選択肢です。",
            "VPC Endpointは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "NAT Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "VPC Peeringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Site-to-Site VPN",
            "VPC Endpoint",
            "NAT Gateway",
            "VPC Peering"
        ]
    },
    {
        "id": "q083",
        "category": "VPC / Networking",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「インターネットを経由してオンプレミスとAWS VPCを暗号化接続する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "VPC Peering",
            "VPC Endpoint",
            "Site-to-Site VPN",
            "Transit Gateway"
        ],
        "answer": 2,
        "explanation": "要件の中心は「インターネットを経由してオンプレミスとAWS VPCを暗号化接続する」です。したがってSite-to-Site VPNを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "VPC Peeringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "VPC Endpointは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Site-to-Site VPNは、インターネットを経由してオンプレミスとAWS VPCを暗号化接続するための選択肢です。",
            "Transit Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Site-to-Site VPN",
            "VPC Peering",
            "VPC Endpoint",
            "Transit Gateway"
        ]
    },
    {
        "id": "q084",
        "category": "VPC / Networking",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「インターネットを経由してオンプレミスとAWS VPCを暗号化接続する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Site-to-Site VPN",
            "Direct Connect",
            "VPC Peering",
            "Transit Gateway"
        ],
        "answer": 0,
        "explanation": "要件の中心は「インターネットを経由してオンプレミスとAWS VPCを暗号化接続する」です。したがってSite-to-Site VPNを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Site-to-Site VPNは、インターネットを経由してオンプレミスとAWS VPCを暗号化接続するための選択肢です。",
            "Direct Connectは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "VPC Peeringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Transit Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Site-to-Site VPN",
            "Direct Connect",
            "VPC Peering",
            "Transit Gateway"
        ]
    },
    {
        "id": "q085",
        "category": "VPC / Networking",
        "difficulty": "やや難",
        "question": "設計レビューで「インターネットを経由してオンプレミスとAWS VPCを暗号化接続する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Site-to-Site VPN",
            "Direct Connect",
            "Security Group",
            "Transit Gateway"
        ],
        "answer": 0,
        "explanation": "要件の中心は「インターネットを経由してオンプレミスとAWS VPCを暗号化接続する」です。したがってSite-to-Site VPNを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Site-to-Site VPNは、インターネットを経由してオンプレミスとAWS VPCを暗号化接続するための選択肢です。",
            "Direct Connectは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Transit Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Site-to-Site VPN",
            "Direct Connect",
            "Security Group",
            "Transit Gateway"
        ]
    },
    {
        "id": "q086",
        "category": "VPC / Networking",
        "difficulty": "標準",
        "question": "企業のAWS環境で「オンプレミスとAWSを専用ネットワーク接続で結ぶ」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "VPC Peering",
            "Transit Gateway",
            "Site-to-Site VPN",
            "Direct Connect"
        ],
        "answer": 3,
        "explanation": "要件の中心は「オンプレミスとAWSを専用ネットワーク接続で結ぶ」です。したがってDirect Connectを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "VPC Peeringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Transit Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Site-to-Site VPNは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Direct Connectは、オンプレミスとAWSを専用ネットワーク接続で結ぶための選択肢です。"
        ],
        "services": [
            "Direct Connect",
            "VPC Peering",
            "Transit Gateway",
            "Site-to-Site VPN"
        ]
    },
    {
        "id": "q087",
        "category": "VPC / Networking",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「オンプレミスとAWSを専用ネットワーク接続で結ぶ」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Site-to-Site VPN",
            "Direct Connect",
            "Transit Gateway",
            "Security Group"
        ],
        "answer": 1,
        "explanation": "要件の中心は「オンプレミスとAWSを専用ネットワーク接続で結ぶ」です。したがってDirect Connectを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Site-to-Site VPNは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Direct Connectは、オンプレミスとAWSを専用ネットワーク接続で結ぶための選択肢です。",
            "Transit Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Direct Connect",
            "Site-to-Site VPN",
            "Transit Gateway",
            "Security Group"
        ]
    },
    {
        "id": "q088",
        "category": "VPC / Networking",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「オンプレミスとAWSを専用ネットワーク接続で結ぶ」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Direct Connect",
            "Security Group",
            "Site-to-Site VPN",
            "Network ACL"
        ],
        "answer": 0,
        "explanation": "要件の中心は「オンプレミスとAWSを専用ネットワーク接続で結ぶ」です。したがってDirect Connectを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Direct Connectは、オンプレミスとAWSを専用ネットワーク接続で結ぶための選択肢です。",
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Site-to-Site VPNは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Network ACLは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Direct Connect",
            "Security Group",
            "Site-to-Site VPN",
            "Network ACL"
        ]
    },
    {
        "id": "q089",
        "category": "VPC / Networking",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「オンプレミスとAWSを専用ネットワーク接続で結ぶ」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Security Group",
            "Direct Connect",
            "Route 53",
            "Network ACL"
        ],
        "answer": 1,
        "explanation": "要件の中心は「オンプレミスとAWSを専用ネットワーク接続で結ぶ」です。したがってDirect Connectを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Security Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Direct Connectは、オンプレミスとAWSを専用ネットワーク接続で結ぶための選択肢です。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Network ACLは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Direct Connect",
            "Security Group",
            "Route 53",
            "Network ACL"
        ]
    },
    {
        "id": "q090",
        "category": "VPC / Networking",
        "difficulty": "やや難",
        "question": "設計レビューで「オンプレミスとAWSを専用ネットワーク接続で結ぶ」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Internet Gateway",
            "Network ACL",
            "Direct Connect",
            "Route 53"
        ],
        "answer": 2,
        "explanation": "要件の中心は「オンプレミスとAWSを専用ネットワーク接続で結ぶ」です。したがってDirect Connectを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Internet Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Network ACLは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Direct Connectは、オンプレミスとAWSを専用ネットワーク接続で結ぶための選択肢です。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Direct Connect",
            "Internet Gateway",
            "Network ACL",
            "Route 53"
        ]
    },
    {
        "id": "q091",
        "category": "VPC / Networking",
        "difficulty": "標準",
        "question": "企業のAWS環境で「EC2などのENIへのインバウンド・アウトバウンド通信をステートフルに制御する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Network ACL",
            "Direct Connect",
            "Route 53",
            "Security Group"
        ],
        "answer": 3,
        "explanation": "要件の中心は「EC2などのENIへのインバウンド・アウトバウンド通信をステートフルに制御する」です。したがってSecurity Groupを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Network ACLは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Direct Connectは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Security Groupは、EC2などのENIへのインバウンド・アウトバウンド通信をステートフルに制御するための選択肢です。"
        ],
        "services": [
            "Security Group",
            "Network ACL",
            "Direct Connect",
            "Route 53"
        ]
    },
    {
        "id": "q092",
        "category": "VPC / Networking",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「EC2などのENIへのインバウンド・アウトバウンド通信をステートフルに制御する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Internet Gateway",
            "Route 53",
            "Network ACL",
            "Security Group"
        ],
        "answer": 3,
        "explanation": "要件の中心は「EC2などのENIへのインバウンド・アウトバウンド通信をステートフルに制御する」です。したがってSecurity Groupを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Internet Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Network ACLは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Security Groupは、EC2などのENIへのインバウンド・アウトバウンド通信をステートフルに制御するための選択肢です。"
        ],
        "services": [
            "Security Group",
            "Internet Gateway",
            "Route 53",
            "Network ACL"
        ]
    },
    {
        "id": "q093",
        "category": "VPC / Networking",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「EC2などのENIへのインバウンド・アウトバウンド通信をステートフルに制御する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "NAT Gateway",
            "Route 53",
            "Internet Gateway",
            "Security Group"
        ],
        "answer": 3,
        "explanation": "要件の中心は「EC2などのENIへのインバウンド・アウトバウンド通信をステートフルに制御する」です。したがってSecurity Groupを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "NAT Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Internet Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Security Groupは、EC2などのENIへのインバウンド・アウトバウンド通信をステートフルに制御するための選択肢です。"
        ],
        "services": [
            "Security Group",
            "NAT Gateway",
            "Route 53",
            "Internet Gateway"
        ]
    },
    {
        "id": "q094",
        "category": "VPC / Networking",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「EC2などのENIへのインバウンド・アウトバウンド通信をステートフルに制御する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Internet Gateway",
            "NAT Gateway",
            "VPC Endpoint",
            "Security Group"
        ],
        "answer": 3,
        "explanation": "要件の中心は「EC2などのENIへのインバウンド・アウトバウンド通信をステートフルに制御する」です。したがってSecurity Groupを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Internet Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "NAT Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "VPC Endpointは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Security Groupは、EC2などのENIへのインバウンド・アウトバウンド通信をステートフルに制御するための選択肢です。"
        ],
        "services": [
            "Security Group",
            "Internet Gateway",
            "NAT Gateway",
            "VPC Endpoint"
        ]
    },
    {
        "id": "q095",
        "category": "VPC / Networking",
        "difficulty": "やや難",
        "question": "設計レビューで「EC2などのENIへのインバウンド・アウトバウンド通信をステートフルに制御する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Security Group",
            "VPC Endpoint",
            "VPC Peering",
            "NAT Gateway"
        ],
        "answer": 0,
        "explanation": "要件の中心は「EC2などのENIへのインバウンド・アウトバウンド通信をステートフルに制御する」です。したがってSecurity Groupを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Security Groupは、EC2などのENIへのインバウンド・アウトバウンド通信をステートフルに制御するための選択肢です。",
            "VPC Endpointは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "VPC Peeringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "NAT Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Security Group",
            "VPC Endpoint",
            "VPC Peering",
            "NAT Gateway"
        ]
    },
    {
        "id": "q096",
        "category": "VPC / Networking",
        "difficulty": "標準",
        "question": "企業のAWS環境で「サブネット境界でステートレスなインバウンド・アウトバウンド通信制御を行う」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Network ACL",
            "NAT Gateway",
            "Internet Gateway",
            "VPC Endpoint"
        ],
        "answer": 0,
        "explanation": "要件の中心は「サブネット境界でステートレスなインバウンド・アウトバウンド通信制御を行う」です。したがってNetwork ACLを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Network ACLは、サブネット境界でステートレスなインバウンド・アウトバウンド通信制御を行うための選択肢です。",
            "NAT Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Internet Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "VPC Endpointは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Network ACL",
            "NAT Gateway",
            "Internet Gateway",
            "VPC Endpoint"
        ]
    },
    {
        "id": "q097",
        "category": "VPC / Networking",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「サブネット境界でステートレスなインバウンド・アウトバウンド通信制御を行う」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "VPC Endpoint",
            "NAT Gateway",
            "VPC Peering",
            "Network ACL"
        ],
        "answer": 3,
        "explanation": "要件の中心は「サブネット境界でステートレスなインバウンド・アウトバウンド通信制御を行う」です。したがってNetwork ACLを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "VPC Endpointは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "NAT Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "VPC Peeringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Network ACLは、サブネット境界でステートレスなインバウンド・アウトバウンド通信制御を行うための選択肢です。"
        ],
        "services": [
            "Network ACL",
            "VPC Endpoint",
            "NAT Gateway",
            "VPC Peering"
        ]
    },
    {
        "id": "q098",
        "category": "VPC / Networking",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「サブネット境界でステートレスなインバウンド・アウトバウンド通信制御を行う」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "VPC Endpoint",
            "Transit Gateway",
            "VPC Peering",
            "Network ACL"
        ],
        "answer": 3,
        "explanation": "要件の中心は「サブネット境界でステートレスなインバウンド・アウトバウンド通信制御を行う」です。したがってNetwork ACLを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "VPC Endpointは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Transit Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "VPC Peeringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Network ACLは、サブネット境界でステートレスなインバウンド・アウトバウンド通信制御を行うための選択肢です。"
        ],
        "services": [
            "Network ACL",
            "VPC Endpoint",
            "Transit Gateway",
            "VPC Peering"
        ]
    },
    {
        "id": "q099",
        "category": "VPC / Networking",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「サブネット境界でステートレスなインバウンド・アウトバウンド通信制御を行う」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "VPC Peering",
            "Site-to-Site VPN",
            "Network ACL",
            "Transit Gateway"
        ],
        "answer": 2,
        "explanation": "要件の中心は「サブネット境界でステートレスなインバウンド・アウトバウンド通信制御を行う」です。したがってNetwork ACLを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "VPC Peeringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Site-to-Site VPNは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Network ACLは、サブネット境界でステートレスなインバウンド・アウトバウンド通信制御を行うための選択肢です。",
            "Transit Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Network ACL",
            "VPC Peering",
            "Site-to-Site VPN",
            "Transit Gateway"
        ]
    },
    {
        "id": "q100",
        "category": "VPC / Networking",
        "difficulty": "やや難",
        "question": "設計レビューで「サブネット境界でステートレスなインバウンド・アウトバウンド通信制御を行う」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Transit Gateway",
            "Site-to-Site VPN",
            "Network ACL",
            "Direct Connect"
        ],
        "answer": 2,
        "explanation": "要件の中心は「サブネット境界でステートレスなインバウンド・アウトバウンド通信制御を行う」です。したがってNetwork ACLを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Transit Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Site-to-Site VPNは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Network ACLは、サブネット境界でステートレスなインバウンド・アウトバウンド通信制御を行うための選択肢です。",
            "Direct Connectは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Network ACL",
            "Transit Gateway",
            "Site-to-Site VPN",
            "Direct Connect"
        ]
    },
    {
        "id": "q101",
        "category": "EC2",
        "difficulty": "標準",
        "question": "企業のAWS環境で「仮想サーバーを柔軟に起動しOSやインスタンスタイプを管理する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Auto Scaling",
            "EC2",
            "AMI",
            "EBS"
        ],
        "answer": 1,
        "explanation": "要件の中心は「仮想サーバーを柔軟に起動しOSやインスタンスタイプを管理する」です。したがってEC2を選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Auto Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。EC2は、仮想サーバーを柔軟に起動しOSやインスタンスタイプを管理するための選択肢です。",
            "AMIは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "EBSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "EC2",
            "Auto Scaling",
            "AMI",
            "EBS"
        ]
    },
    {
        "id": "q102",
        "category": "EC2",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「仮想サーバーを柔軟に起動しOSやインスタンスタイプを管理する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "EBS",
            "EC2",
            "Systems Manager",
            "Auto Scaling"
        ],
        "answer": 1,
        "explanation": "要件の中心は「仮想サーバーを柔軟に起動しOSやインスタンスタイプを管理する」です。したがってEC2を選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "EBSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。EC2は、仮想サーバーを柔軟に起動しOSやインスタンスタイプを管理するための選択肢です。",
            "Systems Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Auto Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "EC2",
            "EBS",
            "Systems Manager",
            "Auto Scaling"
        ]
    },
    {
        "id": "q103",
        "category": "EC2",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「仮想サーバーを柔軟に起動しOSやインスタンスタイプを管理する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Auto Scaling",
            "EC2",
            "Spot Instances",
            "Systems Manager"
        ],
        "answer": 1,
        "explanation": "要件の中心は「仮想サーバーを柔軟に起動しOSやインスタンスタイプを管理する」です。したがってEC2を選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Auto Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。EC2は、仮想サーバーを柔軟に起動しOSやインスタンスタイプを管理するための選択肢です。",
            "Spot Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Systems Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "EC2",
            "Auto Scaling",
            "Spot Instances",
            "Systems Manager"
        ]
    },
    {
        "id": "q104",
        "category": "EC2",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「仮想サーバーを柔軟に起動しOSやインスタンスタイプを管理する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "EC2",
            "Reserved Instances",
            "Systems Manager",
            "Spot Instances"
        ],
        "answer": 0,
        "explanation": "要件の中心は「仮想サーバーを柔軟に起動しOSやインスタンスタイプを管理する」です。したがってEC2を選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。EC2は、仮想サーバーを柔軟に起動しOSやインスタンスタイプを管理するための選択肢です。",
            "Reserved Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Systems Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Spot Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "EC2",
            "Reserved Instances",
            "Systems Manager",
            "Spot Instances"
        ]
    },
    {
        "id": "q105",
        "category": "EC2",
        "difficulty": "やや難",
        "question": "設計レビューで「仮想サーバーを柔軟に起動しOSやインスタンスタイプを管理する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Reserved Instances",
            "Spot Instances",
            "EC2",
            "Elastic IP"
        ],
        "answer": 2,
        "explanation": "要件の中心は「仮想サーバーを柔軟に起動しOSやインスタンスタイプを管理する」です。したがってEC2を選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Reserved Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Spot Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。EC2は、仮想サーバーを柔軟に起動しOSやインスタンスタイプを管理するための選択肢です。",
            "Elastic IPは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "EC2",
            "Reserved Instances",
            "Spot Instances",
            "Elastic IP"
        ]
    },
    {
        "id": "q106",
        "category": "EC2",
        "difficulty": "標準",
        "question": "企業のAWS環境で「EC2のOSや設定を含む起動テンプレートとしてイメージを作成する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Spot Instances",
            "Systems Manager",
            "Reserved Instances",
            "AMI"
        ],
        "answer": 3,
        "explanation": "要件の中心は「EC2のOSや設定を含む起動テンプレートとしてイメージを作成する」です。したがってAMIを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Spot Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Systems Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Reserved Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。AMIは、EC2のOSや設定を含む起動テンプレートとしてイメージを作成するための選択肢です。"
        ],
        "services": [
            "AMI",
            "Spot Instances",
            "Systems Manager",
            "Reserved Instances"
        ]
    },
    {
        "id": "q107",
        "category": "EC2",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「EC2のOSや設定を含む起動テンプレートとしてイメージを作成する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Reserved Instances",
            "Spot Instances",
            "Elastic IP",
            "AMI"
        ],
        "answer": 3,
        "explanation": "要件の中心は「EC2のOSや設定を含む起動テンプレートとしてイメージを作成する」です。したがってAMIを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Reserved Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Spot Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Elastic IPは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。AMIは、EC2のOSや設定を含む起動テンプレートとしてイメージを作成するための選択肢です。"
        ],
        "services": [
            "AMI",
            "Reserved Instances",
            "Spot Instances",
            "Elastic IP"
        ]
    },
    {
        "id": "q108",
        "category": "EC2",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「EC2のOSや設定を含む起動テンプレートとしてイメージを作成する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Reserved Instances",
            "Elastic IP",
            "AMI",
            "Placement Group"
        ],
        "answer": 2,
        "explanation": "要件の中心は「EC2のOSや設定を含む起動テンプレートとしてイメージを作成する」です。したがってAMIを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Reserved Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Elastic IPは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。AMIは、EC2のOSや設定を含む起動テンプレートとしてイメージを作成するための選択肢です。",
            "Placement Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "AMI",
            "Reserved Instances",
            "Elastic IP",
            "Placement Group"
        ]
    },
    {
        "id": "q109",
        "category": "EC2",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「EC2のOSや設定を含む起動テンプレートとしてイメージを作成する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "AMI",
            "Elastic IP",
            "Lambda",
            "Placement Group"
        ],
        "answer": 0,
        "explanation": "要件の中心は「EC2のOSや設定を含む起動テンプレートとしてイメージを作成する」です。したがってAMIを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。AMIは、EC2のOSや設定を含む起動テンプレートとしてイメージを作成するための選択肢です。",
            "Elastic IPは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Lambdaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Placement Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "AMI",
            "Elastic IP",
            "Lambda",
            "Placement Group"
        ]
    },
    {
        "id": "q110",
        "category": "EC2",
        "difficulty": "やや難",
        "question": "設計レビューで「EC2のOSや設定を含む起動テンプレートとしてイメージを作成する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Placement Group",
            "Lambda",
            "AMI",
            "EC2"
        ],
        "answer": 2,
        "explanation": "要件の中心は「EC2のOSや設定を含む起動テンプレートとしてイメージを作成する」です。したがってAMIを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Placement Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Lambdaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。AMIは、EC2のOSや設定を含む起動テンプレートとしてイメージを作成するための選択肢です。",
            "EC2は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "AMI",
            "Placement Group",
            "Lambda",
            "EC2"
        ]
    },
    {
        "id": "q111",
        "category": "EC2",
        "difficulty": "標準",
        "question": "企業のAWS環境で「EC2に接続する永続的なブロックストレージを提供する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Lambda",
            "Elastic IP",
            "EBS",
            "Placement Group"
        ],
        "answer": 2,
        "explanation": "要件の中心は「EC2に接続する永続的なブロックストレージを提供する」です。したがってEBSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Lambdaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Elastic IPは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。EBSは、EC2に接続する永続的なブロックストレージを提供するための選択肢です。",
            "Placement Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "EBS",
            "Lambda",
            "Elastic IP",
            "Placement Group"
        ]
    },
    {
        "id": "q112",
        "category": "EC2",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「EC2に接続する永続的なブロックストレージを提供する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "EBS",
            "Lambda",
            "Placement Group",
            "EC2"
        ],
        "answer": 0,
        "explanation": "要件の中心は「EC2に接続する永続的なブロックストレージを提供する」です。したがってEBSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。EBSは、EC2に接続する永続的なブロックストレージを提供するための選択肢です。",
            "Lambdaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Placement Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "EC2は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "EBS",
            "Lambda",
            "Placement Group",
            "EC2"
        ]
    },
    {
        "id": "q113",
        "category": "EC2",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「EC2に接続する永続的なブロックストレージを提供する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Lambda",
            "AMI",
            "EC2",
            "EBS"
        ],
        "answer": 3,
        "explanation": "要件の中心は「EC2に接続する永続的なブロックストレージを提供する」です。したがってEBSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Lambdaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "AMIは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "EC2は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。EBSは、EC2に接続する永続的なブロックストレージを提供するための選択肢です。"
        ],
        "services": [
            "EBS",
            "Lambda",
            "AMI",
            "EC2"
        ]
    },
    {
        "id": "q114",
        "category": "EC2",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「EC2に接続する永続的なブロックストレージを提供する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "EC2",
            "EBS",
            "Auto Scaling",
            "AMI"
        ],
        "answer": 1,
        "explanation": "要件の中心は「EC2に接続する永続的なブロックストレージを提供する」です。したがってEBSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "EC2は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。EBSは、EC2に接続する永続的なブロックストレージを提供するための選択肢です。",
            "Auto Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "AMIは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "EBS",
            "EC2",
            "Auto Scaling",
            "AMI"
        ]
    },
    {
        "id": "q115",
        "category": "EC2",
        "difficulty": "やや難",
        "question": "設計レビューで「EC2に接続する永続的なブロックストレージを提供する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "EBS",
            "Systems Manager",
            "Auto Scaling",
            "AMI"
        ],
        "answer": 0,
        "explanation": "要件の中心は「EC2に接続する永続的なブロックストレージを提供する」です。したがってEBSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。EBSは、EC2に接続する永続的なブロックストレージを提供するための選択肢です。",
            "Systems Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Auto Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "AMIは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "EBS",
            "Systems Manager",
            "Auto Scaling",
            "AMI"
        ]
    },
    {
        "id": "q116",
        "category": "EC2",
        "difficulty": "標準",
        "question": "企業のAWS環境で「EC2ホストに直接接続された高速だがインスタンス停止・終了などで失われ得る一時ストレージを使う」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "AMI",
            "EC2",
            "Lambda",
            "Instance Store"
        ],
        "answer": 3,
        "explanation": "要件の中心は「EC2ホストに直接接続された高速だがインスタンス停止・終了などで失われ得る一時ストレージを使う」です。したがってInstance Storeを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "AMIは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "EC2は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Lambdaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Instance Storeは、EC2ホストに直接接続された高速だがインスタンス停止・終了などで失われ得る一時ストレージを使うための選択肢です。"
        ],
        "services": [
            "Instance Store",
            "AMI",
            "EC2",
            "Lambda"
        ]
    },
    {
        "id": "q117",
        "category": "EC2",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「EC2ホストに直接接続された高速だがインスタンス停止・終了などで失われ得る一時ストレージを使う」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "EC2",
            "EBS",
            "AMI",
            "Instance Store"
        ],
        "answer": 3,
        "explanation": "要件の中心は「EC2ホストに直接接続された高速だがインスタンス停止・終了などで失われ得る一時ストレージを使う」です。したがってInstance Storeを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "EC2は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "EBSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "AMIは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Instance Storeは、EC2ホストに直接接続された高速だがインスタンス停止・終了などで失われ得る一時ストレージを使うための選択肢です。"
        ],
        "services": [
            "Instance Store",
            "EC2",
            "EBS",
            "AMI"
        ]
    },
    {
        "id": "q118",
        "category": "EC2",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「EC2ホストに直接接続された高速だがインスタンス停止・終了などで失われ得る一時ストレージを使う」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "EBS",
            "Instance Store",
            "AMI",
            "Auto Scaling"
        ],
        "answer": 1,
        "explanation": "要件の中心は「EC2ホストに直接接続された高速だがインスタンス停止・終了などで失われ得る一時ストレージを使う」です。したがってInstance Storeを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "EBSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Instance Storeは、EC2ホストに直接接続された高速だがインスタンス停止・終了などで失われ得る一時ストレージを使うための選択肢です。",
            "AMIは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Auto Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Instance Store",
            "EBS",
            "AMI",
            "Auto Scaling"
        ]
    },
    {
        "id": "q119",
        "category": "EC2",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「EC2ホストに直接接続された高速だがインスタンス停止・終了などで失われ得る一時ストレージを使う」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Instance Store",
            "Systems Manager",
            "EBS",
            "Auto Scaling"
        ],
        "answer": 0,
        "explanation": "要件の中心は「EC2ホストに直接接続された高速だがインスタンス停止・終了などで失われ得る一時ストレージを使う」です。したがってInstance Storeを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Instance Storeは、EC2ホストに直接接続された高速だがインスタンス停止・終了などで失われ得る一時ストレージを使うための選択肢です。",
            "Systems Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "EBSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Auto Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Instance Store",
            "Systems Manager",
            "EBS",
            "Auto Scaling"
        ]
    },
    {
        "id": "q120",
        "category": "EC2",
        "difficulty": "やや難",
        "question": "設計レビューで「EC2ホストに直接接続された高速だがインスタンス停止・終了などで失われ得る一時ストレージを使う」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Auto Scaling",
            "Instance Store",
            "Systems Manager",
            "Spot Instances"
        ],
        "answer": 1,
        "explanation": "要件の中心は「EC2ホストに直接接続された高速だがインスタンス停止・終了などで失われ得る一時ストレージを使う」です。したがってInstance Storeを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Auto Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Instance Storeは、EC2ホストに直接接続された高速だがインスタンス停止・終了などで失われ得る一時ストレージを使うための選択肢です。",
            "Systems Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Spot Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Instance Store",
            "Auto Scaling",
            "Systems Manager",
            "Spot Instances"
        ]
    },
    {
        "id": "q121",
        "category": "EC2",
        "difficulty": "標準",
        "question": "企業のAWS環境で「需要やヘルスチェックに応じてEC2インスタンス数を自動調整する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Spot Instances",
            "Systems Manager",
            "Auto Scaling",
            "Reserved Instances"
        ],
        "answer": 2,
        "explanation": "要件の中心は「需要やヘルスチェックに応じてEC2インスタンス数を自動調整する」です。したがってAuto Scalingを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Spot Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Systems Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Auto Scalingは、需要やヘルスチェックに応じてEC2インスタンス数を自動調整するための選択肢です。",
            "Reserved Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Auto Scaling",
            "Spot Instances",
            "Systems Manager",
            "Reserved Instances"
        ]
    },
    {
        "id": "q122",
        "category": "EC2",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「需要やヘルスチェックに応じてEC2インスタンス数を自動調整する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Auto Scaling",
            "Elastic IP",
            "Reserved Instances",
            "Spot Instances"
        ],
        "answer": 0,
        "explanation": "要件の中心は「需要やヘルスチェックに応じてEC2インスタンス数を自動調整する」です。したがってAuto Scalingを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Auto Scalingは、需要やヘルスチェックに応じてEC2インスタンス数を自動調整するための選択肢です。",
            "Elastic IPは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Reserved Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Spot Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Auto Scaling",
            "Elastic IP",
            "Reserved Instances",
            "Spot Instances"
        ]
    },
    {
        "id": "q123",
        "category": "EC2",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「需要やヘルスチェックに応じてEC2インスタンス数を自動調整する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Auto Scaling",
            "Reserved Instances",
            "Placement Group",
            "Elastic IP"
        ],
        "answer": 0,
        "explanation": "要件の中心は「需要やヘルスチェックに応じてEC2インスタンス数を自動調整する」です。したがってAuto Scalingを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Auto Scalingは、需要やヘルスチェックに応じてEC2インスタンス数を自動調整するための選択肢です。",
            "Reserved Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Placement Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Elastic IPは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Auto Scaling",
            "Reserved Instances",
            "Placement Group",
            "Elastic IP"
        ]
    },
    {
        "id": "q124",
        "category": "EC2",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「需要やヘルスチェックに応じてEC2インスタンス数を自動調整する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Elastic IP",
            "Auto Scaling",
            "Placement Group",
            "Lambda"
        ],
        "answer": 1,
        "explanation": "要件の中心は「需要やヘルスチェックに応じてEC2インスタンス数を自動調整する」です。したがってAuto Scalingを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Elastic IPは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Auto Scalingは、需要やヘルスチェックに応じてEC2インスタンス数を自動調整するための選択肢です。",
            "Placement Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Lambdaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Auto Scaling",
            "Elastic IP",
            "Placement Group",
            "Lambda"
        ]
    },
    {
        "id": "q125",
        "category": "EC2",
        "difficulty": "やや難",
        "question": "設計レビューで「需要やヘルスチェックに応じてEC2インスタンス数を自動調整する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Placement Group",
            "EC2",
            "Lambda",
            "Auto Scaling"
        ],
        "answer": 3,
        "explanation": "要件の中心は「需要やヘルスチェックに応じてEC2インスタンス数を自動調整する」です。したがってAuto Scalingを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Placement Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "EC2は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Lambdaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Auto Scalingは、需要やヘルスチェックに応じてEC2インスタンス数を自動調整するための選択肢です。"
        ],
        "services": [
            "Auto Scaling",
            "Placement Group",
            "EC2",
            "Lambda"
        ]
    },
    {
        "id": "q126",
        "category": "EC2",
        "difficulty": "標準",
        "question": "企業のAWS環境で「EC2などのマネージドノードをコンソールから安全に運用・パッチ管理する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Elastic IP",
            "Placement Group",
            "Systems Manager",
            "Lambda"
        ],
        "answer": 2,
        "explanation": "要件の中心は「EC2などのマネージドノードをコンソールから安全に運用・パッチ管理する」です。したがってSystems Managerを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Elastic IPは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Placement Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Systems Managerは、EC2などのマネージドノードをコンソールから安全に運用・パッチ管理するための選択肢です。",
            "Lambdaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Systems Manager",
            "Elastic IP",
            "Placement Group",
            "Lambda"
        ]
    },
    {
        "id": "q127",
        "category": "EC2",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「EC2などのマネージドノードをコンソールから安全に運用・パッチ管理する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Placement Group",
            "EC2",
            "Systems Manager",
            "Lambda"
        ],
        "answer": 2,
        "explanation": "要件の中心は「EC2などのマネージドノードをコンソールから安全に運用・パッチ管理する」です。したがってSystems Managerを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Placement Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "EC2は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Systems Managerは、EC2などのマネージドノードをコンソールから安全に運用・パッチ管理するための選択肢です。",
            "Lambdaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Systems Manager",
            "Placement Group",
            "EC2",
            "Lambda"
        ]
    },
    {
        "id": "q128",
        "category": "EC2",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「EC2などのマネージドノードをコンソールから安全に運用・パッチ管理する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "AMI",
            "Lambda",
            "Systems Manager",
            "EC2"
        ],
        "answer": 2,
        "explanation": "要件の中心は「EC2などのマネージドノードをコンソールから安全に運用・パッチ管理する」です。したがってSystems Managerを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "AMIは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Lambdaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Systems Managerは、EC2などのマネージドノードをコンソールから安全に運用・パッチ管理するための選択肢です。",
            "EC2は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Systems Manager",
            "AMI",
            "Lambda",
            "EC2"
        ]
    },
    {
        "id": "q129",
        "category": "EC2",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「EC2などのマネージドノードをコンソールから安全に運用・パッチ管理する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "AMI",
            "Systems Manager",
            "EBS",
            "EC2"
        ],
        "answer": 1,
        "explanation": "要件の中心は「EC2などのマネージドノードをコンソールから安全に運用・パッチ管理する」です。したがってSystems Managerを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "AMIは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Systems Managerは、EC2などのマネージドノードをコンソールから安全に運用・パッチ管理するための選択肢です。",
            "EBSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "EC2は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Systems Manager",
            "AMI",
            "EBS",
            "EC2"
        ]
    },
    {
        "id": "q130",
        "category": "EC2",
        "difficulty": "やや難",
        "question": "設計レビューで「EC2などのマネージドノードをコンソールから安全に運用・パッチ管理する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "EBS",
            "AMI",
            "Systems Manager",
            "Auto Scaling"
        ],
        "answer": 2,
        "explanation": "要件の中心は「EC2などのマネージドノードをコンソールから安全に運用・パッチ管理する」です。したがってSystems Managerを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "EBSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "AMIは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Systems Managerは、EC2などのマネージドノードをコンソールから安全に運用・パッチ管理するための選択肢です。",
            "Auto Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Systems Manager",
            "EBS",
            "AMI",
            "Auto Scaling"
        ]
    },
    {
        "id": "q131",
        "category": "EC2",
        "difficulty": "標準",
        "question": "企業のAWS環境で「中断されてもよいワークロードで余剰EC2容量を低価格で利用する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "AMI",
            "EC2",
            "Spot Instances",
            "EBS"
        ],
        "answer": 2,
        "explanation": "要件の中心は「中断されてもよいワークロードで余剰EC2容量を低価格で利用する」です。したがってSpot Instancesを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "AMIは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "EC2は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Spot Instancesは、中断されてもよいワークロードで余剰EC2容量を低価格で利用するための選択肢です。",
            "EBSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Spot Instances",
            "AMI",
            "EC2",
            "EBS"
        ]
    },
    {
        "id": "q132",
        "category": "EC2",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「中断されてもよいワークロードで余剰EC2容量を低価格で利用する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Auto Scaling",
            "AMI",
            "EBS",
            "Spot Instances"
        ],
        "answer": 3,
        "explanation": "要件の中心は「中断されてもよいワークロードで余剰EC2容量を低価格で利用する」です。したがってSpot Instancesを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Auto Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "AMIは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "EBSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Spot Instancesは、中断されてもよいワークロードで余剰EC2容量を低価格で利用するための選択肢です。"
        ],
        "services": [
            "Spot Instances",
            "Auto Scaling",
            "AMI",
            "EBS"
        ]
    },
    {
        "id": "q133",
        "category": "EC2",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「中断されてもよいワークロードで余剰EC2容量を低価格で利用する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Auto Scaling",
            "Spot Instances",
            "Systems Manager",
            "EBS"
        ],
        "answer": 1,
        "explanation": "要件の中心は「中断されてもよいワークロードで余剰EC2容量を低価格で利用する」です。したがってSpot Instancesを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Auto Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Spot Instancesは、中断されてもよいワークロードで余剰EC2容量を低価格で利用するための選択肢です。",
            "Systems Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "EBSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Spot Instances",
            "Auto Scaling",
            "Systems Manager",
            "EBS"
        ]
    },
    {
        "id": "q134",
        "category": "EC2",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「中断されてもよいワークロードで余剰EC2容量を低価格で利用する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Auto Scaling",
            "Systems Manager",
            "Spot Instances",
            "Reserved Instances"
        ],
        "answer": 2,
        "explanation": "要件の中心は「中断されてもよいワークロードで余剰EC2容量を低価格で利用する」です。したがってSpot Instancesを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Auto Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Systems Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Spot Instancesは、中断されてもよいワークロードで余剰EC2容量を低価格で利用するための選択肢です。",
            "Reserved Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Spot Instances",
            "Auto Scaling",
            "Systems Manager",
            "Reserved Instances"
        ]
    },
    {
        "id": "q135",
        "category": "EC2",
        "difficulty": "やや難",
        "question": "設計レビューで「中断されてもよいワークロードで余剰EC2容量を低価格で利用する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Systems Manager",
            "Reserved Instances",
            "Spot Instances",
            "Elastic IP"
        ],
        "answer": 2,
        "explanation": "要件の中心は「中断されてもよいワークロードで余剰EC2容量を低価格で利用する」です。したがってSpot Instancesを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Systems Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Reserved Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Spot Instancesは、中断されてもよいワークロードで余剰EC2容量を低価格で利用するための選択肢です。",
            "Elastic IPは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Spot Instances",
            "Systems Manager",
            "Reserved Instances",
            "Elastic IP"
        ]
    },
    {
        "id": "q136",
        "category": "EC2",
        "difficulty": "標準",
        "question": "企業のAWS環境で「長期的に安定利用するEC2に対して料金割引を得る」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Spot Instances",
            "Auto Scaling",
            "Systems Manager",
            "Reserved Instances"
        ],
        "answer": 3,
        "explanation": "要件の中心は「長期的に安定利用するEC2に対して料金割引を得る」です。したがってReserved Instancesを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Spot Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Auto Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Systems Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Reserved Instancesは、長期的に安定利用するEC2に対して料金割引を得るための選択肢です。"
        ],
        "services": [
            "Reserved Instances",
            "Spot Instances",
            "Auto Scaling",
            "Systems Manager"
        ]
    },
    {
        "id": "q137",
        "category": "EC2",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「長期的に安定利用するEC2に対して料金割引を得る」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Systems Manager",
            "Spot Instances",
            "Reserved Instances",
            "Elastic IP"
        ],
        "answer": 2,
        "explanation": "要件の中心は「長期的に安定利用するEC2に対して料金割引を得る」です。したがってReserved Instancesを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Systems Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Spot Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Reserved Instancesは、長期的に安定利用するEC2に対して料金割引を得るための選択肢です。",
            "Elastic IPは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Reserved Instances",
            "Systems Manager",
            "Spot Instances",
            "Elastic IP"
        ]
    },
    {
        "id": "q138",
        "category": "EC2",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「長期的に安定利用するEC2に対して料金割引を得る」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Placement Group",
            "Elastic IP",
            "Spot Instances",
            "Reserved Instances"
        ],
        "answer": 3,
        "explanation": "要件の中心は「長期的に安定利用するEC2に対して料金割引を得る」です。したがってReserved Instancesを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Placement Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Elastic IPは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Spot Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Reserved Instancesは、長期的に安定利用するEC2に対して料金割引を得るための選択肢です。"
        ],
        "services": [
            "Reserved Instances",
            "Placement Group",
            "Elastic IP",
            "Spot Instances"
        ]
    },
    {
        "id": "q139",
        "category": "EC2",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「長期的に安定利用するEC2に対して料金割引を得る」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Lambda",
            "Elastic IP",
            "Placement Group",
            "Reserved Instances"
        ],
        "answer": 3,
        "explanation": "要件の中心は「長期的に安定利用するEC2に対して料金割引を得る」です。したがってReserved Instancesを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Lambdaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Elastic IPは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Placement Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Reserved Instancesは、長期的に安定利用するEC2に対して料金割引を得るための選択肢です。"
        ],
        "services": [
            "Reserved Instances",
            "Lambda",
            "Elastic IP",
            "Placement Group"
        ]
    },
    {
        "id": "q140",
        "category": "EC2",
        "difficulty": "やや難",
        "question": "設計レビューで「長期的に安定利用するEC2に対して料金割引を得る」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Placement Group",
            "Lambda",
            "Reserved Instances",
            "EC2"
        ],
        "answer": 2,
        "explanation": "要件の中心は「長期的に安定利用するEC2に対して料金割引を得る」です。したがってReserved Instancesを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Placement Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Lambdaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Reserved Instancesは、長期的に安定利用するEC2に対して料金割引を得るための選択肢です。",
            "EC2は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Reserved Instances",
            "Placement Group",
            "Lambda",
            "EC2"
        ]
    },
    {
        "id": "q141",
        "category": "EC2",
        "difficulty": "標準",
        "question": "企業のAWS環境で「EC2などに固定のパブリックIPv4アドレスを割り当てる」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Reserved Instances",
            "Placement Group",
            "Elastic IP",
            "Lambda"
        ],
        "answer": 2,
        "explanation": "要件の中心は「EC2などに固定のパブリックIPv4アドレスを割り当てる」です。したがってElastic IPを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Reserved Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Placement Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Elastic IPは、EC2などに固定のパブリックIPv4アドレスを割り当てるための選択肢です。",
            "Lambdaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Elastic IP",
            "Reserved Instances",
            "Placement Group",
            "Lambda"
        ]
    },
    {
        "id": "q142",
        "category": "EC2",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「EC2などに固定のパブリックIPv4アドレスを割り当てる」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "EC2",
            "Lambda",
            "Elastic IP",
            "Placement Group"
        ],
        "answer": 2,
        "explanation": "要件の中心は「EC2などに固定のパブリックIPv4アドレスを割り当てる」です。したがってElastic IPを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "EC2は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Lambdaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Elastic IPは、EC2などに固定のパブリックIPv4アドレスを割り当てるための選択肢です。",
            "Placement Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Elastic IP",
            "EC2",
            "Lambda",
            "Placement Group"
        ]
    },
    {
        "id": "q143",
        "category": "EC2",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「EC2などに固定のパブリックIPv4アドレスを割り当てる」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "AMI",
            "EC2",
            "Elastic IP",
            "Lambda"
        ],
        "answer": 2,
        "explanation": "要件の中心は「EC2などに固定のパブリックIPv4アドレスを割り当てる」です。したがってElastic IPを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "AMIは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "EC2は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Elastic IPは、EC2などに固定のパブリックIPv4アドレスを割り当てるための選択肢です。",
            "Lambdaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Elastic IP",
            "AMI",
            "EC2",
            "Lambda"
        ]
    },
    {
        "id": "q144",
        "category": "EC2",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「EC2などに固定のパブリックIPv4アドレスを割り当てる」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "EC2",
            "AMI",
            "EBS",
            "Elastic IP"
        ],
        "answer": 3,
        "explanation": "要件の中心は「EC2などに固定のパブリックIPv4アドレスを割り当てる」です。したがってElastic IPを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "EC2は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "AMIは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "EBSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Elastic IPは、EC2などに固定のパブリックIPv4アドレスを割り当てるための選択肢です。"
        ],
        "services": [
            "Elastic IP",
            "EC2",
            "AMI",
            "EBS"
        ]
    },
    {
        "id": "q145",
        "category": "EC2",
        "difficulty": "やや難",
        "question": "設計レビューで「EC2などに固定のパブリックIPv4アドレスを割り当てる」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "EBS",
            "AMI",
            "Auto Scaling",
            "Elastic IP"
        ],
        "answer": 3,
        "explanation": "要件の中心は「EC2などに固定のパブリックIPv4アドレスを割り当てる」です。したがってElastic IPを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "EBSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "AMIは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Auto Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Elastic IPは、EC2などに固定のパブリックIPv4アドレスを割り当てるための選択肢です。"
        ],
        "services": [
            "Elastic IP",
            "EBS",
            "AMI",
            "Auto Scaling"
        ]
    },
    {
        "id": "q146",
        "category": "EC2",
        "difficulty": "標準",
        "question": "企業のAWS環境で「EC2の物理配置を制御して低遅延や高耐障害性など特定の配置要件を満たす」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "AMI",
            "EBS",
            "EC2",
            "Placement Group"
        ],
        "answer": 3,
        "explanation": "要件の中心は「EC2の物理配置を制御して低遅延や高耐障害性など特定の配置要件を満たす」です。したがってPlacement Groupを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "AMIは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "EBSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "EC2は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Placement Groupは、EC2の物理配置を制御して低遅延や高耐障害性など特定の配置要件を満たすための選択肢です。"
        ],
        "services": [
            "Placement Group",
            "AMI",
            "EBS",
            "EC2"
        ]
    },
    {
        "id": "q147",
        "category": "EC2",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「EC2の物理配置を制御して低遅延や高耐障害性など特定の配置要件を満たす」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "AMI",
            "Placement Group",
            "EBS",
            "Auto Scaling"
        ],
        "answer": 1,
        "explanation": "要件の中心は「EC2の物理配置を制御して低遅延や高耐障害性など特定の配置要件を満たす」です。したがってPlacement Groupを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "AMIは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Placement Groupは、EC2の物理配置を制御して低遅延や高耐障害性など特定の配置要件を満たすための選択肢です。",
            "EBSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Auto Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Placement Group",
            "AMI",
            "EBS",
            "Auto Scaling"
        ]
    },
    {
        "id": "q148",
        "category": "EC2",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「EC2の物理配置を制御して低遅延や高耐障害性など特定の配置要件を満たす」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Placement Group",
            "Systems Manager",
            "Auto Scaling",
            "EBS"
        ],
        "answer": 0,
        "explanation": "要件の中心は「EC2の物理配置を制御して低遅延や高耐障害性など特定の配置要件を満たす」です。したがってPlacement Groupを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Placement Groupは、EC2の物理配置を制御して低遅延や高耐障害性など特定の配置要件を満たすための選択肢です。",
            "Systems Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Auto Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "EBSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Placement Group",
            "Systems Manager",
            "Auto Scaling",
            "EBS"
        ]
    },
    {
        "id": "q149",
        "category": "EC2",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「EC2の物理配置を制御して低遅延や高耐障害性など特定の配置要件を満たす」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Auto Scaling",
            "Placement Group",
            "Systems Manager",
            "Spot Instances"
        ],
        "answer": 1,
        "explanation": "要件の中心は「EC2の物理配置を制御して低遅延や高耐障害性など特定の配置要件を満たす」です。したがってPlacement Groupを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Auto Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Placement Groupは、EC2の物理配置を制御して低遅延や高耐障害性など特定の配置要件を満たすための選択肢です。",
            "Systems Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Spot Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Placement Group",
            "Auto Scaling",
            "Systems Manager",
            "Spot Instances"
        ]
    },
    {
        "id": "q150",
        "category": "EC2",
        "difficulty": "やや難",
        "question": "設計レビューで「EC2の物理配置を制御して低遅延や高耐障害性など特定の配置要件を満たす」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Systems Manager",
            "Placement Group",
            "Reserved Instances",
            "Spot Instances"
        ],
        "answer": 1,
        "explanation": "要件の中心は「EC2の物理配置を制御して低遅延や高耐障害性など特定の配置要件を満たす」です。したがってPlacement Groupを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Systems Managerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Placement Groupは、EC2の物理配置を制御して低遅延や高耐障害性など特定の配置要件を満たすための選択肢です。",
            "Reserved Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Spot Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Placement Group",
            "Systems Manager",
            "Reserved Instances",
            "Spot Instances"
        ]
    },
    {
        "id": "q151",
        "category": "S3 / Storage",
        "difficulty": "標準",
        "question": "企業のAWS環境で「高耐久なオブジェクトストレージへファイルやデータを保存する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "S3 Glacier",
            "S3 Versioning",
            "S3",
            "S3 Lifecycle"
        ],
        "answer": 2,
        "explanation": "要件の中心は「高耐久なオブジェクトストレージへファイルやデータを保存する」です。したがってS3を選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Glacierは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Versioningは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3は、高耐久なオブジェクトストレージへファイルやデータを保存するための選択肢です。",
            "S3 Lifecycleは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3",
            "S3 Glacier",
            "S3 Versioning",
            "S3 Lifecycle"
        ]
    },
    {
        "id": "q152",
        "category": "S3 / Storage",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「高耐久なオブジェクトストレージへファイルやデータを保存する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "S3 Object Lock",
            "S3 Glacier",
            "S3",
            "S3 Lifecycle"
        ],
        "answer": 2,
        "explanation": "要件の中心は「高耐久なオブジェクトストレージへファイルやデータを保存する」です。したがってS3を選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Object Lockは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Glacierは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3は、高耐久なオブジェクトストレージへファイルやデータを保存するための選択肢です。",
            "S3 Lifecycleは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3",
            "S3 Object Lock",
            "S3 Glacier",
            "S3 Lifecycle"
        ]
    },
    {
        "id": "q153",
        "category": "S3 / Storage",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「高耐久なオブジェクトストレージへファイルやデータを保存する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "S3 Object Lock",
            "S3 Replication",
            "S3 Glacier",
            "S3"
        ],
        "answer": 3,
        "explanation": "要件の中心は「高耐久なオブジェクトストレージへファイルやデータを保存する」です。したがってS3を選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Object Lockは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Replicationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Glacierは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3は、高耐久なオブジェクトストレージへファイルやデータを保存するための選択肢です。"
        ],
        "services": [
            "S3",
            "S3 Object Lock",
            "S3 Replication",
            "S3 Glacier"
        ]
    },
    {
        "id": "q154",
        "category": "S3 / Storage",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「高耐久なオブジェクトストレージへファイルやデータを保存する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "S3",
            "S3 Object Lock",
            "S3 Multipart Upload",
            "S3 Replication"
        ],
        "answer": 0,
        "explanation": "要件の中心は「高耐久なオブジェクトストレージへファイルやデータを保存する」です。したがってS3を選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。S3は、高耐久なオブジェクトストレージへファイルやデータを保存するための選択肢です。",
            "S3 Object Lockは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Multipart Uploadは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Replicationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3",
            "S3 Object Lock",
            "S3 Multipart Upload",
            "S3 Replication"
        ]
    },
    {
        "id": "q155",
        "category": "S3 / Storage",
        "difficulty": "やや難",
        "question": "設計レビューで「高耐久なオブジェクトストレージへファイルやデータを保存する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "S3 Replication",
            "S3 Multipart Upload",
            "S3",
            "S3 Transfer Acceleration"
        ],
        "answer": 2,
        "explanation": "要件の中心は「高耐久なオブジェクトストレージへファイルやデータを保存する」です。したがってS3を選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Replicationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Multipart Uploadは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3は、高耐久なオブジェクトストレージへファイルやデータを保存するための選択肢です。",
            "S3 Transfer Accelerationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3",
            "S3 Replication",
            "S3 Multipart Upload",
            "S3 Transfer Acceleration"
        ]
    },
    {
        "id": "q156",
        "category": "S3 / Storage",
        "difficulty": "標準",
        "question": "企業のAWS環境で「同じキーのオブジェクトの複数バージョンを保持して誤削除や上書きから復旧する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "S3 Replication",
            "S3 Versioning",
            "S3 Multipart Upload",
            "S3 Object Lock"
        ],
        "answer": 1,
        "explanation": "要件の中心は「同じキーのオブジェクトの複数バージョンを保持して誤削除や上書きから復旧する」です。したがってS3 Versioningを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Replicationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Versioningは、同じキーのオブジェクトの複数バージョンを保持して誤削除や上書きから復旧するための選択肢です。",
            "S3 Multipart Uploadは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Object Lockは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 Versioning",
            "S3 Replication",
            "S3 Multipart Upload",
            "S3 Object Lock"
        ]
    },
    {
        "id": "q157",
        "category": "S3 / Storage",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「同じキーのオブジェクトの複数バージョンを保持して誤削除や上書きから復旧する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "S3 Versioning",
            "S3 Replication",
            "S3 Multipart Upload",
            "S3 Transfer Acceleration"
        ],
        "answer": 0,
        "explanation": "要件の中心は「同じキーのオブジェクトの複数バージョンを保持して誤削除や上書きから復旧する」です。したがってS3 Versioningを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。S3 Versioningは、同じキーのオブジェクトの複数バージョンを保持して誤削除や上書きから復旧するための選択肢です。",
            "S3 Replicationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Multipart Uploadは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Transfer Accelerationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 Versioning",
            "S3 Replication",
            "S3 Multipart Upload",
            "S3 Transfer Acceleration"
        ]
    },
    {
        "id": "q158",
        "category": "S3 / Storage",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「同じキーのオブジェクトの複数バージョンを保持して誤削除や上書きから復旧する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "S3 Transfer Acceleration",
            "S3 Versioning",
            "EFS",
            "S3 Multipart Upload"
        ],
        "answer": 1,
        "explanation": "要件の中心は「同じキーのオブジェクトの複数バージョンを保持して誤削除や上書きから復旧する」です。したがってS3 Versioningを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Transfer Accelerationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Versioningは、同じキーのオブジェクトの複数バージョンを保持して誤削除や上書きから復旧するための選択肢です。",
            "EFSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Multipart Uploadは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 Versioning",
            "S3 Transfer Acceleration",
            "EFS",
            "S3 Multipart Upload"
        ]
    },
    {
        "id": "q159",
        "category": "S3 / Storage",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「同じキーのオブジェクトの複数バージョンを保持して誤削除や上書きから復旧する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "EFS",
            "FSx",
            "S3 Versioning",
            "S3 Transfer Acceleration"
        ],
        "answer": 2,
        "explanation": "要件の中心は「同じキーのオブジェクトの複数バージョンを保持して誤削除や上書きから復旧する」です。したがってS3 Versioningを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "EFSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "FSxは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Versioningは、同じキーのオブジェクトの複数バージョンを保持して誤削除や上書きから復旧するための選択肢です。",
            "S3 Transfer Accelerationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 Versioning",
            "EFS",
            "FSx",
            "S3 Transfer Acceleration"
        ]
    },
    {
        "id": "q160",
        "category": "S3 / Storage",
        "difficulty": "やや難",
        "question": "設計レビューで「同じキーのオブジェクトの複数バージョンを保持して誤削除や上書きから復旧する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "FSx",
            "S3",
            "S3 Versioning",
            "EFS"
        ],
        "answer": 2,
        "explanation": "要件の中心は「同じキーのオブジェクトの複数バージョンを保持して誤削除や上書きから復旧する」です。したがってS3 Versioningを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "FSxは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Versioningは、同じキーのオブジェクトの複数バージョンを保持して誤削除や上書きから復旧するための選択肢です。",
            "EFSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 Versioning",
            "FSx",
            "S3",
            "EFS"
        ]
    },
    {
        "id": "q161",
        "category": "S3 / Storage",
        "difficulty": "標準",
        "question": "企業のAWS環境で「オブジェクトを経過時間に応じて別ストレージクラスへ移行または削除する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "EFS",
            "FSx",
            "S3 Transfer Acceleration",
            "S3 Lifecycle"
        ],
        "answer": 3,
        "explanation": "要件の中心は「オブジェクトを経過時間に応じて別ストレージクラスへ移行または削除する」です。したがってS3 Lifecycleを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "EFSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "FSxは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Transfer Accelerationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Lifecycleは、オブジェクトを経過時間に応じて別ストレージクラスへ移行または削除するための選択肢です。"
        ],
        "services": [
            "S3 Lifecycle",
            "EFS",
            "FSx",
            "S3 Transfer Acceleration"
        ]
    },
    {
        "id": "q162",
        "category": "S3 / Storage",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「オブジェクトを経過時間に応じて別ストレージクラスへ移行または削除する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "S3",
            "S3 Lifecycle",
            "FSx",
            "EFS"
        ],
        "answer": 1,
        "explanation": "要件の中心は「オブジェクトを経過時間に応じて別ストレージクラスへ移行または削除する」です。したがってS3 Lifecycleを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Lifecycleは、オブジェクトを経過時間に応じて別ストレージクラスへ移行または削除するための選択肢です。",
            "FSxは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "EFSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 Lifecycle",
            "S3",
            "FSx",
            "EFS"
        ]
    },
    {
        "id": "q163",
        "category": "S3 / Storage",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「オブジェクトを経過時間に応じて別ストレージクラスへ移行または削除する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "S3 Versioning",
            "FSx",
            "S3 Lifecycle",
            "S3"
        ],
        "answer": 2,
        "explanation": "要件の中心は「オブジェクトを経過時間に応じて別ストレージクラスへ移行または削除する」です。したがってS3 Lifecycleを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Versioningは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "FSxは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Lifecycleは、オブジェクトを経過時間に応じて別ストレージクラスへ移行または削除するための選択肢です。",
            "S3は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 Lifecycle",
            "S3 Versioning",
            "FSx",
            "S3"
        ]
    },
    {
        "id": "q164",
        "category": "S3 / Storage",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「オブジェクトを経過時間に応じて別ストレージクラスへ移行または削除する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "S3",
            "S3 Versioning",
            "S3 Glacier",
            "S3 Lifecycle"
        ],
        "answer": 3,
        "explanation": "要件の中心は「オブジェクトを経過時間に応じて別ストレージクラスへ移行または削除する」です。したがってS3 Lifecycleを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Versioningは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Glacierは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Lifecycleは、オブジェクトを経過時間に応じて別ストレージクラスへ移行または削除するための選択肢です。"
        ],
        "services": [
            "S3 Lifecycle",
            "S3",
            "S3 Versioning",
            "S3 Glacier"
        ]
    },
    {
        "id": "q165",
        "category": "S3 / Storage",
        "difficulty": "やや難",
        "question": "設計レビューで「オブジェクトを経過時間に応じて別ストレージクラスへ移行または削除する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "S3 Versioning",
            "S3 Lifecycle",
            "S3 Glacier",
            "S3 Object Lock"
        ],
        "answer": 1,
        "explanation": "要件の中心は「オブジェクトを経過時間に応じて別ストレージクラスへ移行または削除する」です。したがってS3 Lifecycleを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Versioningは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Lifecycleは、オブジェクトを経過時間に応じて別ストレージクラスへ移行または削除するための選択肢です。",
            "S3 Glacierは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Object Lockは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 Lifecycle",
            "S3 Versioning",
            "S3 Glacier",
            "S3 Object Lock"
        ]
    },
    {
        "id": "q166",
        "category": "S3 / Storage",
        "difficulty": "標準",
        "question": "企業のAWS環境で「長期保存するアクセス頻度の低いデータを低コストでアーカイブする」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "S3 Lifecycle",
            "S3",
            "S3 Versioning",
            "S3 Glacier"
        ],
        "answer": 3,
        "explanation": "要件の中心は「長期保存するアクセス頻度の低いデータを低コストでアーカイブする」です。したがってS3 Glacierを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Lifecycleは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Versioningは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Glacierは、長期保存するアクセス頻度の低いデータを低コストでアーカイブするための選択肢です。"
        ],
        "services": [
            "S3 Glacier",
            "S3 Lifecycle",
            "S3",
            "S3 Versioning"
        ]
    },
    {
        "id": "q167",
        "category": "S3 / Storage",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「長期保存するアクセス頻度の低いデータを低コストでアーカイブする」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "S3 Versioning",
            "S3 Object Lock",
            "S3 Lifecycle",
            "S3 Glacier"
        ],
        "answer": 3,
        "explanation": "要件の中心は「長期保存するアクセス頻度の低いデータを低コストでアーカイブする」です。したがってS3 Glacierを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Versioningは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Object Lockは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Lifecycleは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Glacierは、長期保存するアクセス頻度の低いデータを低コストでアーカイブするための選択肢です。"
        ],
        "services": [
            "S3 Glacier",
            "S3 Versioning",
            "S3 Object Lock",
            "S3 Lifecycle"
        ]
    },
    {
        "id": "q168",
        "category": "S3 / Storage",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「長期保存するアクセス頻度の低いデータを低コストでアーカイブする」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "S3 Object Lock",
            "S3 Glacier",
            "S3 Lifecycle",
            "S3 Replication"
        ],
        "answer": 1,
        "explanation": "要件の中心は「長期保存するアクセス頻度の低いデータを低コストでアーカイブする」です。したがってS3 Glacierを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Object Lockは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Glacierは、長期保存するアクセス頻度の低いデータを低コストでアーカイブするための選択肢です。",
            "S3 Lifecycleは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Replicationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 Glacier",
            "S3 Object Lock",
            "S3 Lifecycle",
            "S3 Replication"
        ]
    },
    {
        "id": "q169",
        "category": "S3 / Storage",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「長期保存するアクセス頻度の低いデータを低コストでアーカイブする」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "S3 Object Lock",
            "S3 Glacier",
            "S3 Multipart Upload",
            "S3 Replication"
        ],
        "answer": 1,
        "explanation": "要件の中心は「長期保存するアクセス頻度の低いデータを低コストでアーカイブする」です。したがってS3 Glacierを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Object Lockは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Glacierは、長期保存するアクセス頻度の低いデータを低コストでアーカイブするための選択肢です。",
            "S3 Multipart Uploadは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Replicationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 Glacier",
            "S3 Object Lock",
            "S3 Multipart Upload",
            "S3 Replication"
        ]
    },
    {
        "id": "q170",
        "category": "S3 / Storage",
        "difficulty": "やや難",
        "question": "設計レビューで「長期保存するアクセス頻度の低いデータを低コストでアーカイブする」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "S3 Replication",
            "S3 Glacier",
            "S3 Transfer Acceleration",
            "S3 Multipart Upload"
        ],
        "answer": 1,
        "explanation": "要件の中心は「長期保存するアクセス頻度の低いデータを低コストでアーカイブする」です。したがってS3 Glacierを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Replicationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Glacierは、長期保存するアクセス頻度の低いデータを低コストでアーカイブするための選択肢です。",
            "S3 Transfer Accelerationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Multipart Uploadは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 Glacier",
            "S3 Replication",
            "S3 Transfer Acceleration",
            "S3 Multipart Upload"
        ]
    },
    {
        "id": "q171",
        "category": "S3 / Storage",
        "difficulty": "標準",
        "question": "企業のAWS環境で「一定期間または保持ポリシーによりオブジェクトの変更・削除を防止する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "S3 Object Lock",
            "S3 Replication",
            "S3 Multipart Upload",
            "S3 Glacier"
        ],
        "answer": 0,
        "explanation": "要件の中心は「一定期間または保持ポリシーによりオブジェクトの変更・削除を防止する」です。したがってS3 Object Lockを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。S3 Object Lockは、一定期間または保持ポリシーによりオブジェクトの変更・削除を防止するための選択肢です。",
            "S3 Replicationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Multipart Uploadは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Glacierは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 Object Lock",
            "S3 Replication",
            "S3 Multipart Upload",
            "S3 Glacier"
        ]
    },
    {
        "id": "q172",
        "category": "S3 / Storage",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「一定期間または保持ポリシーによりオブジェクトの変更・削除を防止する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "S3 Replication",
            "S3 Multipart Upload",
            "S3 Transfer Acceleration",
            "S3 Object Lock"
        ],
        "answer": 3,
        "explanation": "要件の中心は「一定期間または保持ポリシーによりオブジェクトの変更・削除を防止する」です。したがってS3 Object Lockを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Replicationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Multipart Uploadは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Transfer Accelerationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Object Lockは、一定期間または保持ポリシーによりオブジェクトの変更・削除を防止するための選択肢です。"
        ],
        "services": [
            "S3 Object Lock",
            "S3 Replication",
            "S3 Multipart Upload",
            "S3 Transfer Acceleration"
        ]
    },
    {
        "id": "q173",
        "category": "S3 / Storage",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「一定期間または保持ポリシーによりオブジェクトの変更・削除を防止する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "EFS",
            "S3 Object Lock",
            "S3 Multipart Upload",
            "S3 Transfer Acceleration"
        ],
        "answer": 1,
        "explanation": "要件の中心は「一定期間または保持ポリシーによりオブジェクトの変更・削除を防止する」です。したがってS3 Object Lockを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "EFSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Object Lockは、一定期間または保持ポリシーによりオブジェクトの変更・削除を防止するための選択肢です。",
            "S3 Multipart Uploadは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Transfer Accelerationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 Object Lock",
            "EFS",
            "S3 Multipart Upload",
            "S3 Transfer Acceleration"
        ]
    },
    {
        "id": "q174",
        "category": "S3 / Storage",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「一定期間または保持ポリシーによりオブジェクトの変更・削除を防止する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "S3 Object Lock",
            "FSx",
            "S3 Transfer Acceleration",
            "EFS"
        ],
        "answer": 0,
        "explanation": "要件の中心は「一定期間または保持ポリシーによりオブジェクトの変更・削除を防止する」です。したがってS3 Object Lockを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。S3 Object Lockは、一定期間または保持ポリシーによりオブジェクトの変更・削除を防止するための選択肢です。",
            "FSxは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Transfer Accelerationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "EFSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 Object Lock",
            "FSx",
            "S3 Transfer Acceleration",
            "EFS"
        ]
    },
    {
        "id": "q175",
        "category": "S3 / Storage",
        "difficulty": "やや難",
        "question": "設計レビューで「一定期間または保持ポリシーによりオブジェクトの変更・削除を防止する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "EFS",
            "S3 Object Lock",
            "S3",
            "FSx"
        ],
        "answer": 1,
        "explanation": "要件の中心は「一定期間または保持ポリシーによりオブジェクトの変更・削除を防止する」です。したがってS3 Object Lockを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "EFSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Object Lockは、一定期間または保持ポリシーによりオブジェクトの変更・削除を防止するための選択肢です。",
            "S3は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "FSxは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 Object Lock",
            "EFS",
            "S3",
            "FSx"
        ]
    },
    {
        "id": "q176",
        "category": "S3 / Storage",
        "difficulty": "標準",
        "question": "企業のAWS環境で「S3オブジェクトを別バケットや別リージョンへ自動複製する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "S3 Replication",
            "EFS",
            "S3 Transfer Acceleration",
            "FSx"
        ],
        "answer": 0,
        "explanation": "要件の中心は「S3オブジェクトを別バケットや別リージョンへ自動複製する」です。したがってS3 Replicationを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。S3 Replicationは、S3オブジェクトを別バケットや別リージョンへ自動複製するための選択肢です。",
            "EFSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Transfer Accelerationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "FSxは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 Replication",
            "EFS",
            "S3 Transfer Acceleration",
            "FSx"
        ]
    },
    {
        "id": "q177",
        "category": "S3 / Storage",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「S3オブジェクトを別バケットや別リージョンへ自動複製する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "S3",
            "EFS",
            "FSx",
            "S3 Replication"
        ],
        "answer": 3,
        "explanation": "要件の中心は「S3オブジェクトを別バケットや別リージョンへ自動複製する」です。したがってS3 Replicationを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "EFSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "FSxは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Replicationは、S3オブジェクトを別バケットや別リージョンへ自動複製するための選択肢です。"
        ],
        "services": [
            "S3 Replication",
            "S3",
            "EFS",
            "FSx"
        ]
    },
    {
        "id": "q178",
        "category": "S3 / Storage",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「S3オブジェクトを別バケットや別リージョンへ自動複製する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "S3",
            "S3 Versioning",
            "S3 Replication",
            "FSx"
        ],
        "answer": 2,
        "explanation": "要件の中心は「S3オブジェクトを別バケットや別リージョンへ自動複製する」です。したがってS3 Replicationを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Versioningは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Replicationは、S3オブジェクトを別バケットや別リージョンへ自動複製するための選択肢です。",
            "FSxは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 Replication",
            "S3",
            "S3 Versioning",
            "FSx"
        ]
    },
    {
        "id": "q179",
        "category": "S3 / Storage",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「S3オブジェクトを別バケットや別リージョンへ自動複製する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "S3 Replication",
            "S3 Lifecycle",
            "S3",
            "S3 Versioning"
        ],
        "answer": 0,
        "explanation": "要件の中心は「S3オブジェクトを別バケットや別リージョンへ自動複製する」です。したがってS3 Replicationを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。S3 Replicationは、S3オブジェクトを別バケットや別リージョンへ自動複製するための選択肢です。",
            "S3 Lifecycleは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Versioningは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 Replication",
            "S3 Lifecycle",
            "S3",
            "S3 Versioning"
        ]
    },
    {
        "id": "q180",
        "category": "S3 / Storage",
        "difficulty": "やや難",
        "question": "設計レビューで「S3オブジェクトを別バケットや別リージョンへ自動複製する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "S3 Lifecycle",
            "S3 Replication",
            "S3 Glacier",
            "S3 Versioning"
        ],
        "answer": 1,
        "explanation": "要件の中心は「S3オブジェクトを別バケットや別リージョンへ自動複製する」です。したがってS3 Replicationを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Lifecycleは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Replicationは、S3オブジェクトを別バケットや別リージョンへ自動複製するための選択肢です。",
            "S3 Glacierは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Versioningは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 Replication",
            "S3 Lifecycle",
            "S3 Glacier",
            "S3 Versioning"
        ]
    },
    {
        "id": "q181",
        "category": "S3 / Storage",
        "difficulty": "標準",
        "question": "企業のAWS環境で「大容量オブジェクトを分割して効率よくアップロードする」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "S3 Lifecycle",
            "S3 Multipart Upload",
            "S3 Versioning",
            "S3"
        ],
        "answer": 1,
        "explanation": "要件の中心は「大容量オブジェクトを分割して効率よくアップロードする」です。したがってS3 Multipart Uploadを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Lifecycleは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Multipart Uploadは、大容量オブジェクトを分割して効率よくアップロードするための選択肢です。",
            "S3 Versioningは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 Multipart Upload",
            "S3 Lifecycle",
            "S3 Versioning",
            "S3"
        ]
    },
    {
        "id": "q182",
        "category": "S3 / Storage",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「大容量オブジェクトを分割して効率よくアップロードする」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "S3 Multipart Upload",
            "S3 Lifecycle",
            "S3 Glacier",
            "S3 Versioning"
        ],
        "answer": 0,
        "explanation": "要件の中心は「大容量オブジェクトを分割して効率よくアップロードする」です。したがってS3 Multipart Uploadを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。S3 Multipart Uploadは、大容量オブジェクトを分割して効率よくアップロードするための選択肢です。",
            "S3 Lifecycleは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Glacierは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Versioningは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 Multipart Upload",
            "S3 Lifecycle",
            "S3 Glacier",
            "S3 Versioning"
        ]
    },
    {
        "id": "q183",
        "category": "S3 / Storage",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「大容量オブジェクトを分割して効率よくアップロードする」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "S3 Glacier",
            "S3 Multipart Upload",
            "S3 Lifecycle",
            "S3 Object Lock"
        ],
        "answer": 1,
        "explanation": "要件の中心は「大容量オブジェクトを分割して効率よくアップロードする」です。したがってS3 Multipart Uploadを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Glacierは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Multipart Uploadは、大容量オブジェクトを分割して効率よくアップロードするための選択肢です。",
            "S3 Lifecycleは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Object Lockは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 Multipart Upload",
            "S3 Glacier",
            "S3 Lifecycle",
            "S3 Object Lock"
        ]
    },
    {
        "id": "q184",
        "category": "S3 / Storage",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「大容量オブジェクトを分割して効率よくアップロードする」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "S3 Replication",
            "S3 Glacier",
            "S3 Multipart Upload",
            "S3 Object Lock"
        ],
        "answer": 2,
        "explanation": "要件の中心は「大容量オブジェクトを分割して効率よくアップロードする」です。したがってS3 Multipart Uploadを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Replicationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Glacierは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Multipart Uploadは、大容量オブジェクトを分割して効率よくアップロードするための選択肢です。",
            "S3 Object Lockは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 Multipart Upload",
            "S3 Replication",
            "S3 Glacier",
            "S3 Object Lock"
        ]
    },
    {
        "id": "q185",
        "category": "S3 / Storage",
        "difficulty": "やや難",
        "question": "設計レビューで「大容量オブジェクトを分割して効率よくアップロードする」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "S3 Transfer Acceleration",
            "S3 Replication",
            "S3 Object Lock",
            "S3 Multipart Upload"
        ],
        "answer": 3,
        "explanation": "要件の中心は「大容量オブジェクトを分割して効率よくアップロードする」です。したがってS3 Multipart Uploadを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Transfer Accelerationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Replicationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Object Lockは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Multipart Uploadは、大容量オブジェクトを分割して効率よくアップロードするための選択肢です。"
        ],
        "services": [
            "S3 Multipart Upload",
            "S3 Transfer Acceleration",
            "S3 Replication",
            "S3 Object Lock"
        ]
    },
    {
        "id": "q186",
        "category": "S3 / Storage",
        "difficulty": "標準",
        "question": "企業のAWS環境で「遠隔地からS3へアップロードする際にエッジロケーションを経由して転送を高速化する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "S3 Glacier",
            "S3 Object Lock",
            "S3 Transfer Acceleration",
            "S3 Replication"
        ],
        "answer": 2,
        "explanation": "要件の中心は「遠隔地からS3へアップロードする際にエッジロケーションを経由して転送を高速化する」です。したがってS3 Transfer Accelerationを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Glacierは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Object Lockは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Transfer Accelerationは、遠隔地からS3へアップロードする際にエッジロケーションを経由して転送を高速化するための選択肢です。",
            "S3 Replicationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 Transfer Acceleration",
            "S3 Glacier",
            "S3 Object Lock",
            "S3 Replication"
        ]
    },
    {
        "id": "q187",
        "category": "S3 / Storage",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「遠隔地からS3へアップロードする際にエッジロケーションを経由して転送を高速化する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "S3 Multipart Upload",
            "S3 Object Lock",
            "S3 Transfer Acceleration",
            "S3 Replication"
        ],
        "answer": 2,
        "explanation": "要件の中心は「遠隔地からS3へアップロードする際にエッジロケーションを経由して転送を高速化する」です。したがってS3 Transfer Accelerationを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Multipart Uploadは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Object Lockは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Transfer Accelerationは、遠隔地からS3へアップロードする際にエッジロケーションを経由して転送を高速化するための選択肢です。",
            "S3 Replicationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 Transfer Acceleration",
            "S3 Multipart Upload",
            "S3 Object Lock",
            "S3 Replication"
        ]
    },
    {
        "id": "q188",
        "category": "S3 / Storage",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「遠隔地からS3へアップロードする際にエッジロケーションを経由して転送を高速化する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "S3 Transfer Acceleration",
            "EFS",
            "S3 Multipart Upload",
            "S3 Replication"
        ],
        "answer": 0,
        "explanation": "要件の中心は「遠隔地からS3へアップロードする際にエッジロケーションを経由して転送を高速化する」です。したがってS3 Transfer Accelerationを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。S3 Transfer Accelerationは、遠隔地からS3へアップロードする際にエッジロケーションを経由して転送を高速化するための選択肢です。",
            "EFSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Multipart Uploadは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Replicationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 Transfer Acceleration",
            "EFS",
            "S3 Multipart Upload",
            "S3 Replication"
        ]
    },
    {
        "id": "q189",
        "category": "S3 / Storage",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「遠隔地からS3へアップロードする際にエッジロケーションを経由して転送を高速化する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "FSx",
            "S3 Multipart Upload",
            "S3 Transfer Acceleration",
            "EFS"
        ],
        "answer": 2,
        "explanation": "要件の中心は「遠隔地からS3へアップロードする際にエッジロケーションを経由して転送を高速化する」です。したがってS3 Transfer Accelerationを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "FSxは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Multipart Uploadは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Transfer Accelerationは、遠隔地からS3へアップロードする際にエッジロケーションを経由して転送を高速化するための選択肢です。",
            "EFSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 Transfer Acceleration",
            "FSx",
            "S3 Multipart Upload",
            "EFS"
        ]
    },
    {
        "id": "q190",
        "category": "S3 / Storage",
        "difficulty": "やや難",
        "question": "設計レビューで「遠隔地からS3へアップロードする際にエッジロケーションを経由して転送を高速化する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "S3",
            "EFS",
            "S3 Transfer Acceleration",
            "FSx"
        ],
        "answer": 2,
        "explanation": "要件の中心は「遠隔地からS3へアップロードする際にエッジロケーションを経由して転送を高速化する」です。したがってS3 Transfer Accelerationを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "EFSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Transfer Accelerationは、遠隔地からS3へアップロードする際にエッジロケーションを経由して転送を高速化するための選択肢です。",
            "FSxは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 Transfer Acceleration",
            "S3",
            "EFS",
            "FSx"
        ]
    },
    {
        "id": "q191",
        "category": "S3 / Storage",
        "difficulty": "標準",
        "question": "企業のAWS環境で「複数のEC2から同時にマウントできるマネージドNFSファイルシステムを提供する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "FSx",
            "S3 Multipart Upload",
            "S3 Transfer Acceleration",
            "EFS"
        ],
        "answer": 3,
        "explanation": "要件の中心は「複数のEC2から同時にマウントできるマネージドNFSファイルシステムを提供する」です。したがってEFSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "FSxは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Multipart Uploadは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Transfer Accelerationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。EFSは、複数のEC2から同時にマウントできるマネージドNFSファイルシステムを提供するための選択肢です。"
        ],
        "services": [
            "EFS",
            "FSx",
            "S3 Multipart Upload",
            "S3 Transfer Acceleration"
        ]
    },
    {
        "id": "q192",
        "category": "S3 / Storage",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「複数のEC2から同時にマウントできるマネージドNFSファイルシステムを提供する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "S3 Transfer Acceleration",
            "S3",
            "FSx",
            "EFS"
        ],
        "answer": 3,
        "explanation": "要件の中心は「複数のEC2から同時にマウントできるマネージドNFSファイルシステムを提供する」です。したがってEFSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Transfer Accelerationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "FSxは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。EFSは、複数のEC2から同時にマウントできるマネージドNFSファイルシステムを提供するための選択肢です。"
        ],
        "services": [
            "EFS",
            "S3 Transfer Acceleration",
            "S3",
            "FSx"
        ]
    },
    {
        "id": "q193",
        "category": "S3 / Storage",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「複数のEC2から同時にマウントできるマネージドNFSファイルシステムを提供する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "FSx",
            "S3",
            "S3 Versioning",
            "EFS"
        ],
        "answer": 3,
        "explanation": "要件の中心は「複数のEC2から同時にマウントできるマネージドNFSファイルシステムを提供する」です。したがってEFSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "FSxは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Versioningは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。EFSは、複数のEC2から同時にマウントできるマネージドNFSファイルシステムを提供するための選択肢です。"
        ],
        "services": [
            "EFS",
            "FSx",
            "S3",
            "S3 Versioning"
        ]
    },
    {
        "id": "q194",
        "category": "S3 / Storage",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「複数のEC2から同時にマウントできるマネージドNFSファイルシステムを提供する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "S3",
            "EFS",
            "S3 Versioning",
            "S3 Lifecycle"
        ],
        "answer": 1,
        "explanation": "要件の中心は「複数のEC2から同時にマウントできるマネージドNFSファイルシステムを提供する」です。したがってEFSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。EFSは、複数のEC2から同時にマウントできるマネージドNFSファイルシステムを提供するための選択肢です。",
            "S3 Versioningは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Lifecycleは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "EFS",
            "S3",
            "S3 Versioning",
            "S3 Lifecycle"
        ]
    },
    {
        "id": "q195",
        "category": "S3 / Storage",
        "difficulty": "やや難",
        "question": "設計レビューで「複数のEC2から同時にマウントできるマネージドNFSファイルシステムを提供する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "S3 Lifecycle",
            "EFS",
            "S3 Glacier",
            "S3 Versioning"
        ],
        "answer": 1,
        "explanation": "要件の中心は「複数のEC2から同時にマウントできるマネージドNFSファイルシステムを提供する」です。したがってEFSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Lifecycleは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。EFSは、複数のEC2から同時にマウントできるマネージドNFSファイルシステムを提供するための選択肢です。",
            "S3 Glacierは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Versioningは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "EFS",
            "S3 Lifecycle",
            "S3 Glacier",
            "S3 Versioning"
        ]
    },
    {
        "id": "q196",
        "category": "S3 / Storage",
        "difficulty": "標準",
        "question": "企業のAWS環境で「Windows File Serverや高性能ファイルシステムなど用途別のマネージドファイルシステムを提供する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "S3 Versioning",
            "S3",
            "S3 Lifecycle",
            "FSx"
        ],
        "answer": 3,
        "explanation": "要件の中心は「Windows File Serverや高性能ファイルシステムなど用途別のマネージドファイルシステムを提供する」です。したがってFSxを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Versioningは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Lifecycleは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。FSxは、Windows File Serverや高性能ファイルシステムなど用途別のマネージドファイルシステムを提供するための選択肢です。"
        ],
        "services": [
            "FSx",
            "S3 Versioning",
            "S3",
            "S3 Lifecycle"
        ]
    },
    {
        "id": "q197",
        "category": "S3 / Storage",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「Windows File Serverや高性能ファイルシステムなど用途別のマネージドファイルシステムを提供する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "S3 Lifecycle",
            "FSx",
            "S3 Glacier",
            "S3 Versioning"
        ],
        "answer": 1,
        "explanation": "要件の中心は「Windows File Serverや高性能ファイルシステムなど用途別のマネージドファイルシステムを提供する」です。したがってFSxを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Lifecycleは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。FSxは、Windows File Serverや高性能ファイルシステムなど用途別のマネージドファイルシステムを提供するための選択肢です。",
            "S3 Glacierは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Versioningは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "FSx",
            "S3 Lifecycle",
            "S3 Glacier",
            "S3 Versioning"
        ]
    },
    {
        "id": "q198",
        "category": "S3 / Storage",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「Windows File Serverや高性能ファイルシステムなど用途別のマネージドファイルシステムを提供する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "FSx",
            "S3 Object Lock",
            "S3 Lifecycle",
            "S3 Glacier"
        ],
        "answer": 0,
        "explanation": "要件の中心は「Windows File Serverや高性能ファイルシステムなど用途別のマネージドファイルシステムを提供する」です。したがってFSxを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。FSxは、Windows File Serverや高性能ファイルシステムなど用途別のマネージドファイルシステムを提供するための選択肢です。",
            "S3 Object Lockは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Lifecycleは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Glacierは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "FSx",
            "S3 Object Lock",
            "S3 Lifecycle",
            "S3 Glacier"
        ]
    },
    {
        "id": "q199",
        "category": "S3 / Storage",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「Windows File Serverや高性能ファイルシステムなど用途別のマネージドファイルシステムを提供する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "S3 Replication",
            "S3 Object Lock",
            "FSx",
            "S3 Glacier"
        ],
        "answer": 2,
        "explanation": "要件の中心は「Windows File Serverや高性能ファイルシステムなど用途別のマネージドファイルシステムを提供する」です。したがってFSxを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Replicationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Object Lockは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。FSxは、Windows File Serverや高性能ファイルシステムなど用途別のマネージドファイルシステムを提供するための選択肢です。",
            "S3 Glacierは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "FSx",
            "S3 Replication",
            "S3 Object Lock",
            "S3 Glacier"
        ]
    },
    {
        "id": "q200",
        "category": "S3 / Storage",
        "difficulty": "やや難",
        "question": "設計レビューで「Windows File Serverや高性能ファイルシステムなど用途別のマネージドファイルシステムを提供する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "S3 Multipart Upload",
            "FSx",
            "S3 Replication",
            "S3 Object Lock"
        ],
        "answer": 1,
        "explanation": "要件の中心は「Windows File Serverや高性能ファイルシステムなど用途別のマネージドファイルシステムを提供する」です。したがってFSxを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Multipart Uploadは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。FSxは、Windows File Serverや高性能ファイルシステムなど用途別のマネージドファイルシステムを提供するための選択肢です。",
            "S3 Replicationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Object Lockは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "FSx",
            "S3 Multipart Upload",
            "S3 Replication",
            "S3 Object Lock"
        ]
    },
    {
        "id": "q201",
        "category": "RDS / Database",
        "difficulty": "標準",
        "question": "企業のAWS環境で「MySQLやPostgreSQLなどのリレーショナルデータベースをマネージドで利用する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Aurora",
            "RDS Read Replica",
            "RDS Multi-AZ",
            "RDS"
        ],
        "answer": 3,
        "explanation": "要件の中心は「MySQLやPostgreSQLなどのリレーショナルデータベースをマネージドで利用する」です。したがってRDSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Auroraは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDS Read Replicaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDS Multi-AZは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。RDSは、MySQLやPostgreSQLなどのリレーショナルデータベースをマネージドで利用するための選択肢です。"
        ],
        "services": [
            "RDS",
            "Aurora",
            "RDS Read Replica",
            "RDS Multi-AZ"
        ]
    },
    {
        "id": "q202",
        "category": "RDS / Database",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「MySQLやPostgreSQLなどのリレーショナルデータベースをマネージドで利用する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "RDS",
            "Aurora",
            "RDS Read Replica",
            "RDS Proxy"
        ],
        "answer": 0,
        "explanation": "要件の中心は「MySQLやPostgreSQLなどのリレーショナルデータベースをマネージドで利用する」です。したがってRDSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。RDSは、MySQLやPostgreSQLなどのリレーショナルデータベースをマネージドで利用するための選択肢です。",
            "Auroraは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDS Read Replicaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDS Proxyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "RDS",
            "Aurora",
            "RDS Read Replica",
            "RDS Proxy"
        ]
    },
    {
        "id": "q203",
        "category": "RDS / Database",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「MySQLやPostgreSQLなどのリレーショナルデータベースをマネージドで利用する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "RDS",
            "DynamoDB",
            "RDS Proxy",
            "Aurora"
        ],
        "answer": 0,
        "explanation": "要件の中心は「MySQLやPostgreSQLなどのリレーショナルデータベースをマネージドで利用する」です。したがってRDSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。RDSは、MySQLやPostgreSQLなどのリレーショナルデータベースをマネージドで利用するための選択肢です。",
            "DynamoDBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDS Proxyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Auroraは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "RDS",
            "DynamoDB",
            "RDS Proxy",
            "Aurora"
        ]
    },
    {
        "id": "q204",
        "category": "RDS / Database",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「MySQLやPostgreSQLなどのリレーショナルデータベースをマネージドで利用する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "DAX",
            "RDS Proxy",
            "RDS",
            "DynamoDB"
        ],
        "answer": 2,
        "explanation": "要件の中心は「MySQLやPostgreSQLなどのリレーショナルデータベースをマネージドで利用する」です。したがってRDSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "DAXは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDS Proxyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。RDSは、MySQLやPostgreSQLなどのリレーショナルデータベースをマネージドで利用するための選択肢です。",
            "DynamoDBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "RDS",
            "DAX",
            "RDS Proxy",
            "DynamoDB"
        ]
    },
    {
        "id": "q205",
        "category": "RDS / Database",
        "difficulty": "やや難",
        "question": "設計レビューで「MySQLやPostgreSQLなどのリレーショナルデータベースをマネージドで利用する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "RDS",
            "DynamoDB",
            "DAX",
            "ElastiCache"
        ],
        "answer": 0,
        "explanation": "要件の中心は「MySQLやPostgreSQLなどのリレーショナルデータベースをマネージドで利用する」です。したがってRDSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。RDSは、MySQLやPostgreSQLなどのリレーショナルデータベースをマネージドで利用するための選択肢です。",
            "DynamoDBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "DAXは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "ElastiCacheは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "RDS",
            "DynamoDB",
            "DAX",
            "ElastiCache"
        ]
    },
    {
        "id": "q206",
        "category": "RDS / Database",
        "difficulty": "標準",
        "question": "企業のAWS環境で「データベース障害時の自動フェイルオーバーによる高可用性を実現する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "DAX",
            "RDS Proxy",
            "DynamoDB",
            "RDS Multi-AZ"
        ],
        "answer": 3,
        "explanation": "要件の中心は「データベース障害時の自動フェイルオーバーによる高可用性を実現する」です。したがってRDS Multi-AZを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "DAXは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDS Proxyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "DynamoDBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。RDS Multi-AZは、データベース障害時の自動フェイルオーバーによる高可用性を実現するための選択肢です。"
        ],
        "services": [
            "RDS Multi-AZ",
            "DAX",
            "RDS Proxy",
            "DynamoDB"
        ]
    },
    {
        "id": "q207",
        "category": "RDS / Database",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「データベース障害時の自動フェイルオーバーによる高可用性を実現する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "RDS Multi-AZ",
            "DAX",
            "DynamoDB",
            "ElastiCache"
        ],
        "answer": 0,
        "explanation": "要件の中心は「データベース障害時の自動フェイルオーバーによる高可用性を実現する」です。したがってRDS Multi-AZを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。RDS Multi-AZは、データベース障害時の自動フェイルオーバーによる高可用性を実現するための選択肢です。",
            "DAXは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "DynamoDBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "ElastiCacheは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "RDS Multi-AZ",
            "DAX",
            "DynamoDB",
            "ElastiCache"
        ]
    },
    {
        "id": "q208",
        "category": "RDS / Database",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「データベース障害時の自動フェイルオーバーによる高可用性を実現する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Redshift",
            "DAX",
            "ElastiCache",
            "RDS Multi-AZ"
        ],
        "answer": 3,
        "explanation": "要件の中心は「データベース障害時の自動フェイルオーバーによる高可用性を実現する」です。したがってRDS Multi-AZを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Redshiftは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "DAXは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "ElastiCacheは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。RDS Multi-AZは、データベース障害時の自動フェイルオーバーによる高可用性を実現するための選択肢です。"
        ],
        "services": [
            "RDS Multi-AZ",
            "Redshift",
            "DAX",
            "ElastiCache"
        ]
    },
    {
        "id": "q209",
        "category": "RDS / Database",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「データベース障害時の自動フェイルオーバーによる高可用性を実現する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Athena",
            "Redshift",
            "ElastiCache",
            "RDS Multi-AZ"
        ],
        "answer": 3,
        "explanation": "要件の中心は「データベース障害時の自動フェイルオーバーによる高可用性を実現する」です。したがってRDS Multi-AZを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Athenaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Redshiftは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "ElastiCacheは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。RDS Multi-AZは、データベース障害時の自動フェイルオーバーによる高可用性を実現するための選択肢です。"
        ],
        "services": [
            "RDS Multi-AZ",
            "Athena",
            "Redshift",
            "ElastiCache"
        ]
    },
    {
        "id": "q210",
        "category": "RDS / Database",
        "difficulty": "やや難",
        "question": "設計レビューで「データベース障害時の自動フェイルオーバーによる高可用性を実現する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "RDS Multi-AZ",
            "Athena",
            "RDS",
            "Redshift"
        ],
        "answer": 0,
        "explanation": "要件の中心は「データベース障害時の自動フェイルオーバーによる高可用性を実現する」です。したがってRDS Multi-AZを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。RDS Multi-AZは、データベース障害時の自動フェイルオーバーによる高可用性を実現するための選択肢です。",
            "Athenaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Redshiftは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "RDS Multi-AZ",
            "Athena",
            "RDS",
            "Redshift"
        ]
    },
    {
        "id": "q211",
        "category": "RDS / Database",
        "difficulty": "標準",
        "question": "企業のAWS環境で「読み取り処理をレプリカへ分散して読み取り性能を向上させる」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "ElastiCache",
            "Athena",
            "Redshift",
            "RDS Read Replica"
        ],
        "answer": 3,
        "explanation": "要件の中心は「読み取り処理をレプリカへ分散して読み取り性能を向上させる」です。したがってRDS Read Replicaを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "ElastiCacheは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Athenaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Redshiftは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。RDS Read Replicaは、読み取り処理をレプリカへ分散して読み取り性能を向上させるための選択肢です。"
        ],
        "services": [
            "RDS Read Replica",
            "ElastiCache",
            "Athena",
            "Redshift"
        ]
    },
    {
        "id": "q212",
        "category": "RDS / Database",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「読み取り処理をレプリカへ分散して読み取り性能を向上させる」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Athena",
            "RDS",
            "RDS Read Replica",
            "Redshift"
        ],
        "answer": 2,
        "explanation": "要件の中心は「読み取り処理をレプリカへ分散して読み取り性能を向上させる」です。したがってRDS Read Replicaを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Athenaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。RDS Read Replicaは、読み取り処理をレプリカへ分散して読み取り性能を向上させるための選択肢です。",
            "Redshiftは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "RDS Read Replica",
            "Athena",
            "RDS",
            "Redshift"
        ]
    },
    {
        "id": "q213",
        "category": "RDS / Database",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「読み取り処理をレプリカへ分散して読み取り性能を向上させる」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "RDS Read Replica",
            "RDS Multi-AZ",
            "Athena",
            "RDS"
        ],
        "answer": 0,
        "explanation": "要件の中心は「読み取り処理をレプリカへ分散して読み取り性能を向上させる」です。したがってRDS Read Replicaを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。RDS Read Replicaは、読み取り処理をレプリカへ分散して読み取り性能を向上させるための選択肢です。",
            "RDS Multi-AZは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Athenaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "RDS Read Replica",
            "RDS Multi-AZ",
            "Athena",
            "RDS"
        ]
    },
    {
        "id": "q214",
        "category": "RDS / Database",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「読み取り処理をレプリカへ分散して読み取り性能を向上させる」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "RDS Multi-AZ",
            "Aurora",
            "RDS Read Replica",
            "RDS"
        ],
        "answer": 2,
        "explanation": "要件の中心は「読み取り処理をレプリカへ分散して読み取り性能を向上させる」です。したがってRDS Read Replicaを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "RDS Multi-AZは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Auroraは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。RDS Read Replicaは、読み取り処理をレプリカへ分散して読み取り性能を向上させるための選択肢です。",
            "RDSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "RDS Read Replica",
            "RDS Multi-AZ",
            "Aurora",
            "RDS"
        ]
    },
    {
        "id": "q215",
        "category": "RDS / Database",
        "difficulty": "やや難",
        "question": "設計レビューで「読み取り処理をレプリカへ分散して読み取り性能を向上させる」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "RDS Proxy",
            "RDS Multi-AZ",
            "RDS Read Replica",
            "Aurora"
        ],
        "answer": 2,
        "explanation": "要件の中心は「読み取り処理をレプリカへ分散して読み取り性能を向上させる」です。したがってRDS Read Replicaを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "RDS Proxyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDS Multi-AZは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。RDS Read Replicaは、読み取り処理をレプリカへ分散して読み取り性能を向上させるための選択肢です。",
            "Auroraは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "RDS Read Replica",
            "RDS Proxy",
            "RDS Multi-AZ",
            "Aurora"
        ]
    },
    {
        "id": "q216",
        "category": "RDS / Database",
        "difficulty": "標準",
        "question": "企業のAWS環境で「AWSが提供する高性能・高可用性のリレーショナルデータベースを利用する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Aurora",
            "RDS",
            "RDS Multi-AZ",
            "RDS Read Replica"
        ],
        "answer": 0,
        "explanation": "要件の中心は「AWSが提供する高性能・高可用性のリレーショナルデータベースを利用する」です。したがってAuroraを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Auroraは、AWSが提供する高性能・高可用性のリレーショナルデータベースを利用するための選択肢です。",
            "RDSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDS Multi-AZは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDS Read Replicaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Aurora",
            "RDS",
            "RDS Multi-AZ",
            "RDS Read Replica"
        ]
    },
    {
        "id": "q217",
        "category": "RDS / Database",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「AWSが提供する高性能・高可用性のリレーショナルデータベースを利用する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Aurora",
            "RDS Proxy",
            "RDS Multi-AZ",
            "RDS Read Replica"
        ],
        "answer": 0,
        "explanation": "要件の中心は「AWSが提供する高性能・高可用性のリレーショナルデータベースを利用する」です。したがってAuroraを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Auroraは、AWSが提供する高性能・高可用性のリレーショナルデータベースを利用するための選択肢です。",
            "RDS Proxyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDS Multi-AZは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDS Read Replicaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Aurora",
            "RDS Proxy",
            "RDS Multi-AZ",
            "RDS Read Replica"
        ]
    },
    {
        "id": "q218",
        "category": "RDS / Database",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「AWSが提供する高性能・高可用性のリレーショナルデータベースを利用する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "RDS Proxy",
            "Aurora",
            "RDS Read Replica",
            "DynamoDB"
        ],
        "answer": 1,
        "explanation": "要件の中心は「AWSが提供する高性能・高可用性のリレーショナルデータベースを利用する」です。したがってAuroraを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "RDS Proxyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Auroraは、AWSが提供する高性能・高可用性のリレーショナルデータベースを利用するための選択肢です。",
            "RDS Read Replicaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "DynamoDBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Aurora",
            "RDS Proxy",
            "RDS Read Replica",
            "DynamoDB"
        ]
    },
    {
        "id": "q219",
        "category": "RDS / Database",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「AWSが提供する高性能・高可用性のリレーショナルデータベースを利用する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "DAX",
            "DynamoDB",
            "Aurora",
            "RDS Proxy"
        ],
        "answer": 2,
        "explanation": "要件の中心は「AWSが提供する高性能・高可用性のリレーショナルデータベースを利用する」です。したがってAuroraを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "DAXは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "DynamoDBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Auroraは、AWSが提供する高性能・高可用性のリレーショナルデータベースを利用するための選択肢です。",
            "RDS Proxyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Aurora",
            "DAX",
            "DynamoDB",
            "RDS Proxy"
        ]
    },
    {
        "id": "q220",
        "category": "RDS / Database",
        "difficulty": "やや難",
        "question": "設計レビューで「AWSが提供する高性能・高可用性のリレーショナルデータベースを利用する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "DAX",
            "Aurora",
            "ElastiCache",
            "DynamoDB"
        ],
        "answer": 1,
        "explanation": "要件の中心は「AWSが提供する高性能・高可用性のリレーショナルデータベースを利用する」です。したがってAuroraを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "DAXは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Auroraは、AWSが提供する高性能・高可用性のリレーショナルデータベースを利用するための選択肢です。",
            "ElastiCacheは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "DynamoDBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Aurora",
            "DAX",
            "ElastiCache",
            "DynamoDB"
        ]
    },
    {
        "id": "q221",
        "category": "RDS / Database",
        "difficulty": "標準",
        "question": "企業のAWS環境で「アプリケーションとRDS間のDB接続をプールして接続負荷を抑える」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "RDS Proxy",
            "DynamoDB",
            "Aurora",
            "DAX"
        ],
        "answer": 0,
        "explanation": "要件の中心は「アプリケーションとRDS間のDB接続をプールして接続負荷を抑える」です。したがってRDS Proxyを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。RDS Proxyは、アプリケーションとRDS間のDB接続をプールして接続負荷を抑えるための選択肢です。",
            "DynamoDBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Auroraは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "DAXは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "RDS Proxy",
            "DynamoDB",
            "Aurora",
            "DAX"
        ]
    },
    {
        "id": "q222",
        "category": "RDS / Database",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「アプリケーションとRDS間のDB接続をプールして接続負荷を抑える」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "ElastiCache",
            "RDS Proxy",
            "DAX",
            "DynamoDB"
        ],
        "answer": 1,
        "explanation": "要件の中心は「アプリケーションとRDS間のDB接続をプールして接続負荷を抑える」です。したがってRDS Proxyを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "ElastiCacheは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。RDS Proxyは、アプリケーションとRDS間のDB接続をプールして接続負荷を抑えるための選択肢です。",
            "DAXは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "DynamoDBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "RDS Proxy",
            "ElastiCache",
            "DAX",
            "DynamoDB"
        ]
    },
    {
        "id": "q223",
        "category": "RDS / Database",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「アプリケーションとRDS間のDB接続をプールして接続負荷を抑える」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "DAX",
            "Redshift",
            "ElastiCache",
            "RDS Proxy"
        ],
        "answer": 3,
        "explanation": "要件の中心は「アプリケーションとRDS間のDB接続をプールして接続負荷を抑える」です。したがってRDS Proxyを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "DAXは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Redshiftは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "ElastiCacheは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。RDS Proxyは、アプリケーションとRDS間のDB接続をプールして接続負荷を抑えるための選択肢です。"
        ],
        "services": [
            "RDS Proxy",
            "DAX",
            "Redshift",
            "ElastiCache"
        ]
    },
    {
        "id": "q224",
        "category": "RDS / Database",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「アプリケーションとRDS間のDB接続をプールして接続負荷を抑える」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "RDS Proxy",
            "Athena",
            "Redshift",
            "ElastiCache"
        ],
        "answer": 0,
        "explanation": "要件の中心は「アプリケーションとRDS間のDB接続をプールして接続負荷を抑える」です。したがってRDS Proxyを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。RDS Proxyは、アプリケーションとRDS間のDB接続をプールして接続負荷を抑えるための選択肢です。",
            "Athenaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Redshiftは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "ElastiCacheは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "RDS Proxy",
            "Athena",
            "Redshift",
            "ElastiCache"
        ]
    },
    {
        "id": "q225",
        "category": "RDS / Database",
        "difficulty": "やや難",
        "question": "設計レビューで「アプリケーションとRDS間のDB接続をプールして接続負荷を抑える」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Redshift",
            "RDS",
            "Athena",
            "RDS Proxy"
        ],
        "answer": 3,
        "explanation": "要件の中心は「アプリケーションとRDS間のDB接続をプールして接続負荷を抑える」です。したがってRDS Proxyを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Redshiftは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Athenaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。RDS Proxyは、アプリケーションとRDS間のDB接続をプールして接続負荷を抑えるための選択肢です。"
        ],
        "services": [
            "RDS Proxy",
            "Redshift",
            "RDS",
            "Athena"
        ]
    },
    {
        "id": "q226",
        "category": "RDS / Database",
        "difficulty": "標準",
        "question": "企業のAWS環境で「サーバーレスで高スケールなNoSQLキーバリューデータベースを利用する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "DynamoDB",
            "ElastiCache",
            "Athena",
            "Redshift"
        ],
        "answer": 0,
        "explanation": "要件の中心は「サーバーレスで高スケールなNoSQLキーバリューデータベースを利用する」です。したがってDynamoDBを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。DynamoDBは、サーバーレスで高スケールなNoSQLキーバリューデータベースを利用するための選択肢です。",
            "ElastiCacheは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Athenaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Redshiftは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "DynamoDB",
            "ElastiCache",
            "Athena",
            "Redshift"
        ]
    },
    {
        "id": "q227",
        "category": "RDS / Database",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「サーバーレスで高スケールなNoSQLキーバリューデータベースを利用する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "RDS",
            "Redshift",
            "DynamoDB",
            "Athena"
        ],
        "answer": 2,
        "explanation": "要件の中心は「サーバーレスで高スケールなNoSQLキーバリューデータベースを利用する」です。したがってDynamoDBを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "RDSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Redshiftは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。DynamoDBは、サーバーレスで高スケールなNoSQLキーバリューデータベースを利用するための選択肢です。",
            "Athenaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "DynamoDB",
            "RDS",
            "Redshift",
            "Athena"
        ]
    },
    {
        "id": "q228",
        "category": "RDS / Database",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「サーバーレスで高スケールなNoSQLキーバリューデータベースを利用する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "DynamoDB",
            "Athena",
            "RDS",
            "RDS Multi-AZ"
        ],
        "answer": 0,
        "explanation": "要件の中心は「サーバーレスで高スケールなNoSQLキーバリューデータベースを利用する」です。したがってDynamoDBを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。DynamoDBは、サーバーレスで高スケールなNoSQLキーバリューデータベースを利用するための選択肢です。",
            "Athenaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDS Multi-AZは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "DynamoDB",
            "Athena",
            "RDS",
            "RDS Multi-AZ"
        ]
    },
    {
        "id": "q229",
        "category": "RDS / Database",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「サーバーレスで高スケールなNoSQLキーバリューデータベースを利用する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "DynamoDB",
            "RDS",
            "RDS Read Replica",
            "RDS Multi-AZ"
        ],
        "answer": 0,
        "explanation": "要件の中心は「サーバーレスで高スケールなNoSQLキーバリューデータベースを利用する」です。したがってDynamoDBを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。DynamoDBは、サーバーレスで高スケールなNoSQLキーバリューデータベースを利用するための選択肢です。",
            "RDSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDS Read Replicaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDS Multi-AZは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "DynamoDB",
            "RDS",
            "RDS Read Replica",
            "RDS Multi-AZ"
        ]
    },
    {
        "id": "q230",
        "category": "RDS / Database",
        "difficulty": "やや難",
        "question": "設計レビューで「サーバーレスで高スケールなNoSQLキーバリューデータベースを利用する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "RDS Multi-AZ",
            "Aurora",
            "DynamoDB",
            "RDS Read Replica"
        ],
        "answer": 2,
        "explanation": "要件の中心は「サーバーレスで高スケールなNoSQLキーバリューデータベースを利用する」です。したがってDynamoDBを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "RDS Multi-AZは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Auroraは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。DynamoDBは、サーバーレスで高スケールなNoSQLキーバリューデータベースを利用するための選択肢です。",
            "RDS Read Replicaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "DynamoDB",
            "RDS Multi-AZ",
            "Aurora",
            "RDS Read Replica"
        ]
    },
    {
        "id": "q231",
        "category": "RDS / Database",
        "difficulty": "標準",
        "question": "企業のAWS環境で「DynamoDBの読み取りをマイクロ秒級まで高速化するインメモリキャッシュを利用する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "RDS",
            "RDS Multi-AZ",
            "RDS Read Replica",
            "DAX"
        ],
        "answer": 3,
        "explanation": "要件の中心は「DynamoDBの読み取りをマイクロ秒級まで高速化するインメモリキャッシュを利用する」です。したがってDAXを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "RDSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDS Multi-AZは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDS Read Replicaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。DAXは、DynamoDBの読み取りをマイクロ秒級まで高速化するインメモリキャッシュを利用するための選択肢です。"
        ],
        "services": [
            "DAX",
            "RDS",
            "RDS Multi-AZ",
            "RDS Read Replica"
        ]
    },
    {
        "id": "q232",
        "category": "RDS / Database",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「DynamoDBの読み取りをマイクロ秒級まで高速化するインメモリキャッシュを利用する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "RDS Read Replica",
            "DAX",
            "Aurora",
            "RDS Multi-AZ"
        ],
        "answer": 1,
        "explanation": "要件の中心は「DynamoDBの読み取りをマイクロ秒級まで高速化するインメモリキャッシュを利用する」です。したがってDAXを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "RDS Read Replicaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。DAXは、DynamoDBの読み取りをマイクロ秒級まで高速化するインメモリキャッシュを利用するための選択肢です。",
            "Auroraは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDS Multi-AZは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "DAX",
            "RDS Read Replica",
            "Aurora",
            "RDS Multi-AZ"
        ]
    },
    {
        "id": "q233",
        "category": "RDS / Database",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「DynamoDBの読み取りをマイクロ秒級まで高速化するインメモリキャッシュを利用する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Aurora",
            "RDS Proxy",
            "DAX",
            "RDS Read Replica"
        ],
        "answer": 2,
        "explanation": "要件の中心は「DynamoDBの読み取りをマイクロ秒級まで高速化するインメモリキャッシュを利用する」です。したがってDAXを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Auroraは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDS Proxyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。DAXは、DynamoDBの読み取りをマイクロ秒級まで高速化するインメモリキャッシュを利用するための選択肢です。",
            "RDS Read Replicaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "DAX",
            "Aurora",
            "RDS Proxy",
            "RDS Read Replica"
        ]
    },
    {
        "id": "q234",
        "category": "RDS / Database",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「DynamoDBの読み取りをマイクロ秒級まで高速化するインメモリキャッシュを利用する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Aurora",
            "DynamoDB",
            "DAX",
            "RDS Proxy"
        ],
        "answer": 2,
        "explanation": "要件の中心は「DynamoDBの読み取りをマイクロ秒級まで高速化するインメモリキャッシュを利用する」です。したがってDAXを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Auroraは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "DynamoDBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。DAXは、DynamoDBの読み取りをマイクロ秒級まで高速化するインメモリキャッシュを利用するための選択肢です。",
            "RDS Proxyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "DAX",
            "Aurora",
            "DynamoDB",
            "RDS Proxy"
        ]
    },
    {
        "id": "q235",
        "category": "RDS / Database",
        "difficulty": "やや難",
        "question": "設計レビューで「DynamoDBの読み取りをマイクロ秒級まで高速化するインメモリキャッシュを利用する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "DynamoDB",
            "ElastiCache",
            "RDS Proxy",
            "DAX"
        ],
        "answer": 3,
        "explanation": "要件の中心は「DynamoDBの読み取りをマイクロ秒級まで高速化するインメモリキャッシュを利用する」です。したがってDAXを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "DynamoDBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "ElastiCacheは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDS Proxyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。DAXは、DynamoDBの読み取りをマイクロ秒級まで高速化するインメモリキャッシュを利用するための選択肢です。"
        ],
        "services": [
            "DAX",
            "DynamoDB",
            "ElastiCache",
            "RDS Proxy"
        ]
    },
    {
        "id": "q236",
        "category": "RDS / Database",
        "difficulty": "標準",
        "question": "企業のAWS環境で「RedisやMemcachedによるインメモリキャッシュでDB負荷やレイテンシを低減する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "DynamoDB",
            "RDS Proxy",
            "ElastiCache",
            "Aurora"
        ],
        "answer": 2,
        "explanation": "要件の中心は「RedisやMemcachedによるインメモリキャッシュでDB負荷やレイテンシを低減する」です。したがってElastiCacheを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "DynamoDBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDS Proxyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。ElastiCacheは、RedisやMemcachedによるインメモリキャッシュでDB負荷やレイテンシを低減するための選択肢です。",
            "Auroraは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "ElastiCache",
            "DynamoDB",
            "RDS Proxy",
            "Aurora"
        ]
    },
    {
        "id": "q237",
        "category": "RDS / Database",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「RedisやMemcachedによるインメモリキャッシュでDB負荷やレイテンシを低減する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "DynamoDB",
            "ElastiCache",
            "RDS Proxy",
            "DAX"
        ],
        "answer": 1,
        "explanation": "要件の中心は「RedisやMemcachedによるインメモリキャッシュでDB負荷やレイテンシを低減する」です。したがってElastiCacheを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "DynamoDBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。ElastiCacheは、RedisやMemcachedによるインメモリキャッシュでDB負荷やレイテンシを低減するための選択肢です。",
            "RDS Proxyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "DAXは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "ElastiCache",
            "DynamoDB",
            "RDS Proxy",
            "DAX"
        ]
    },
    {
        "id": "q238",
        "category": "RDS / Database",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「RedisやMemcachedによるインメモリキャッシュでDB負荷やレイテンシを低減する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "ElastiCache",
            "DAX",
            "DynamoDB",
            "Redshift"
        ],
        "answer": 0,
        "explanation": "要件の中心は「RedisやMemcachedによるインメモリキャッシュでDB負荷やレイテンシを低減する」です。したがってElastiCacheを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。ElastiCacheは、RedisやMemcachedによるインメモリキャッシュでDB負荷やレイテンシを低減するための選択肢です。",
            "DAXは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "DynamoDBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Redshiftは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "ElastiCache",
            "DAX",
            "DynamoDB",
            "Redshift"
        ]
    },
    {
        "id": "q239",
        "category": "RDS / Database",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「RedisやMemcachedによるインメモリキャッシュでDB負荷やレイテンシを低減する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Athena",
            "Redshift",
            "DAX",
            "ElastiCache"
        ],
        "answer": 3,
        "explanation": "要件の中心は「RedisやMemcachedによるインメモリキャッシュでDB負荷やレイテンシを低減する」です。したがってElastiCacheを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Athenaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Redshiftは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "DAXは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。ElastiCacheは、RedisやMemcachedによるインメモリキャッシュでDB負荷やレイテンシを低減するための選択肢です。"
        ],
        "services": [
            "ElastiCache",
            "Athena",
            "Redshift",
            "DAX"
        ]
    },
    {
        "id": "q240",
        "category": "RDS / Database",
        "difficulty": "やや難",
        "question": "設計レビューで「RedisやMemcachedによるインメモリキャッシュでDB負荷やレイテンシを低減する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Redshift",
            "ElastiCache",
            "Athena",
            "RDS"
        ],
        "answer": 1,
        "explanation": "要件の中心は「RedisやMemcachedによるインメモリキャッシュでDB負荷やレイテンシを低減する」です。したがってElastiCacheを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Redshiftは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。ElastiCacheは、RedisやMemcachedによるインメモリキャッシュでDB負荷やレイテンシを低減するための選択肢です。",
            "Athenaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "ElastiCache",
            "Redshift",
            "Athena",
            "RDS"
        ]
    },
    {
        "id": "q241",
        "category": "RDS / Database",
        "difficulty": "標準",
        "question": "企業のAWS環境で「大規模な分析クエリを列指向データウェアハウスで処理する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "DAX",
            "Athena",
            "Redshift",
            "ElastiCache"
        ],
        "answer": 2,
        "explanation": "要件の中心は「大規模な分析クエリを列指向データウェアハウスで処理する」です。したがってRedshiftを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "DAXは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Athenaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Redshiftは、大規模な分析クエリを列指向データウェアハウスで処理するための選択肢です。",
            "ElastiCacheは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Redshift",
            "DAX",
            "Athena",
            "ElastiCache"
        ]
    },
    {
        "id": "q242",
        "category": "RDS / Database",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「大規模な分析クエリを列指向データウェアハウスで処理する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Athena",
            "ElastiCache",
            "Redshift",
            "RDS"
        ],
        "answer": 2,
        "explanation": "要件の中心は「大規模な分析クエリを列指向データウェアハウスで処理する」です。したがってRedshiftを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Athenaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "ElastiCacheは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Redshiftは、大規模な分析クエリを列指向データウェアハウスで処理するための選択肢です。",
            "RDSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Redshift",
            "Athena",
            "ElastiCache",
            "RDS"
        ]
    },
    {
        "id": "q243",
        "category": "RDS / Database",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「大規模な分析クエリを列指向データウェアハウスで処理する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "RDS Multi-AZ",
            "Redshift",
            "RDS",
            "Athena"
        ],
        "answer": 1,
        "explanation": "要件の中心は「大規模な分析クエリを列指向データウェアハウスで処理する」です。したがってRedshiftを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "RDS Multi-AZは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Redshiftは、大規模な分析クエリを列指向データウェアハウスで処理するための選択肢です。",
            "RDSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Athenaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Redshift",
            "RDS Multi-AZ",
            "RDS",
            "Athena"
        ]
    },
    {
        "id": "q244",
        "category": "RDS / Database",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「大規模な分析クエリを列指向データウェアハウスで処理する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "RDS",
            "RDS Read Replica",
            "RDS Multi-AZ",
            "Redshift"
        ],
        "answer": 3,
        "explanation": "要件の中心は「大規模な分析クエリを列指向データウェアハウスで処理する」です。したがってRedshiftを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "RDSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDS Read Replicaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDS Multi-AZは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Redshiftは、大規模な分析クエリを列指向データウェアハウスで処理するための選択肢です。"
        ],
        "services": [
            "Redshift",
            "RDS",
            "RDS Read Replica",
            "RDS Multi-AZ"
        ]
    },
    {
        "id": "q245",
        "category": "RDS / Database",
        "difficulty": "やや難",
        "question": "設計レビューで「大規模な分析クエリを列指向データウェアハウスで処理する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "RDS Read Replica",
            "Redshift",
            "Aurora",
            "RDS Multi-AZ"
        ],
        "answer": 1,
        "explanation": "要件の中心は「大規模な分析クエリを列指向データウェアハウスで処理する」です。したがってRedshiftを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "RDS Read Replicaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Redshiftは、大規模な分析クエリを列指向データウェアハウスで処理するための選択肢です。",
            "Auroraは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDS Multi-AZは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Redshift",
            "RDS Read Replica",
            "Aurora",
            "RDS Multi-AZ"
        ]
    },
    {
        "id": "q246",
        "category": "RDS / Database",
        "difficulty": "標準",
        "question": "企業のAWS環境で「S3上のデータをサーバーレスでSQLクエリ分析する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "RDS Read Replica",
            "Athena",
            "RDS Multi-AZ",
            "RDS"
        ],
        "answer": 1,
        "explanation": "要件の中心は「S3上のデータをサーバーレスでSQLクエリ分析する」です。したがってAthenaを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "RDS Read Replicaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Athenaは、S3上のデータをサーバーレスでSQLクエリ分析するための選択肢です。",
            "RDS Multi-AZは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Athena",
            "RDS Read Replica",
            "RDS Multi-AZ",
            "RDS"
        ]
    },
    {
        "id": "q247",
        "category": "RDS / Database",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「S3上のデータをサーバーレスでSQLクエリ分析する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Athena",
            "RDS Multi-AZ",
            "Aurora",
            "RDS Read Replica"
        ],
        "answer": 0,
        "explanation": "要件の中心は「S3上のデータをサーバーレスでSQLクエリ分析する」です。したがってAthenaを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Athenaは、S3上のデータをサーバーレスでSQLクエリ分析するための選択肢です。",
            "RDS Multi-AZは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Auroraは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDS Read Replicaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Athena",
            "RDS Multi-AZ",
            "Aurora",
            "RDS Read Replica"
        ]
    },
    {
        "id": "q248",
        "category": "RDS / Database",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「S3上のデータをサーバーレスでSQLクエリ分析する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "RDS Read Replica",
            "RDS Proxy",
            "Aurora",
            "Athena"
        ],
        "answer": 3,
        "explanation": "要件の中心は「S3上のデータをサーバーレスでSQLクエリ分析する」です。したがってAthenaを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "RDS Read Replicaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDS Proxyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Auroraは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Athenaは、S3上のデータをサーバーレスでSQLクエリ分析するための選択肢です。"
        ],
        "services": [
            "Athena",
            "RDS Read Replica",
            "RDS Proxy",
            "Aurora"
        ]
    },
    {
        "id": "q249",
        "category": "RDS / Database",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「S3上のデータをサーバーレスでSQLクエリ分析する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Aurora",
            "Athena",
            "RDS Proxy",
            "DynamoDB"
        ],
        "answer": 1,
        "explanation": "要件の中心は「S3上のデータをサーバーレスでSQLクエリ分析する」です。したがってAthenaを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Auroraは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Athenaは、S3上のデータをサーバーレスでSQLクエリ分析するための選択肢です。",
            "RDS Proxyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "DynamoDBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Athena",
            "Aurora",
            "RDS Proxy",
            "DynamoDB"
        ]
    },
    {
        "id": "q250",
        "category": "RDS / Database",
        "difficulty": "やや難",
        "question": "設計レビューで「S3上のデータをサーバーレスでSQLクエリ分析する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "DAX",
            "DynamoDB",
            "RDS Proxy",
            "Athena"
        ],
        "answer": 3,
        "explanation": "要件の中心は「S3上のデータをサーバーレスでSQLクエリ分析する」です。したがってAthenaを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "DAXは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "DynamoDBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RDS Proxyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Athenaは、S3上のデータをサーバーレスでSQLクエリ分析するための選択肢です。"
        ],
        "services": [
            "Athena",
            "DAX",
            "DynamoDB",
            "RDS Proxy"
        ]
    },
    {
        "id": "q251",
        "category": "ELB / Auto Scaling",
        "difficulty": "標準",
        "question": "企業のAWS環境で「HTTP/HTTPSを理解しパスやホスト名などの条件でWebトラフィックを分散する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Target Group",
            "ALB",
            "GWLB",
            "NLB"
        ],
        "answer": 1,
        "explanation": "要件の中心は「HTTP/HTTPSを理解しパスやホスト名などの条件でWebトラフィックを分散する」です。したがってALBを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Target Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。ALBは、HTTP/HTTPSを理解しパスやホスト名などの条件でWebトラフィックを分散するための選択肢です。",
            "GWLBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "NLBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "ALB",
            "Target Group",
            "GWLB",
            "NLB"
        ]
    },
    {
        "id": "q252",
        "category": "ELB / Auto Scaling",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「HTTP/HTTPSを理解しパスやホスト名などの条件でWebトラフィックを分散する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Auto Scaling Group",
            "Target Group",
            "GWLB",
            "ALB"
        ],
        "answer": 3,
        "explanation": "要件の中心は「HTTP/HTTPSを理解しパスやホスト名などの条件でWebトラフィックを分散する」です。したがってALBを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Auto Scaling Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Target Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "GWLBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。ALBは、HTTP/HTTPSを理解しパスやホスト名などの条件でWebトラフィックを分散するための選択肢です。"
        ],
        "services": [
            "ALB",
            "Auto Scaling Group",
            "Target Group",
            "GWLB"
        ]
    },
    {
        "id": "q253",
        "category": "ELB / Auto Scaling",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「HTTP/HTTPSを理解しパスやホスト名などの条件でWebトラフィックを分散する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "ALB",
            "Target Group",
            "Auto Scaling Group",
            "Health Check"
        ],
        "answer": 0,
        "explanation": "要件の中心は「HTTP/HTTPSを理解しパスやホスト名などの条件でWebトラフィックを分散する」です。したがってALBを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。ALBは、HTTP/HTTPSを理解しパスやホスト名などの条件でWebトラフィックを分散するための選択肢です。",
            "Target Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Auto Scaling Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "ALB",
            "Target Group",
            "Auto Scaling Group",
            "Health Check"
        ]
    },
    {
        "id": "q254",
        "category": "ELB / Auto Scaling",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「HTTP/HTTPSを理解しパスやホスト名などの条件でWebトラフィックを分散する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "ALB",
            "Health Check",
            "Step Scaling",
            "Auto Scaling Group"
        ],
        "answer": 0,
        "explanation": "要件の中心は「HTTP/HTTPSを理解しパスやホスト名などの条件でWebトラフィックを分散する」です。したがってALBを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。ALBは、HTTP/HTTPSを理解しパスやホスト名などの条件でWebトラフィックを分散するための選択肢です。",
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Step Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Auto Scaling Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "ALB",
            "Health Check",
            "Step Scaling",
            "Auto Scaling Group"
        ]
    },
    {
        "id": "q255",
        "category": "ELB / Auto Scaling",
        "difficulty": "やや難",
        "question": "設計レビューで「HTTP/HTTPSを理解しパスやホスト名などの条件でWebトラフィックを分散する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "ALB",
            "Health Check",
            "Step Scaling",
            "Target Tracking"
        ],
        "answer": 0,
        "explanation": "要件の中心は「HTTP/HTTPSを理解しパスやホスト名などの条件でWebトラフィックを分散する」です。したがってALBを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。ALBは、HTTP/HTTPSを理解しパスやホスト名などの条件でWebトラフィックを分散するための選択肢です。",
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Step Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Target Trackingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "ALB",
            "Health Check",
            "Step Scaling",
            "Target Tracking"
        ]
    },
    {
        "id": "q256",
        "category": "ELB / Auto Scaling",
        "difficulty": "標準",
        "question": "企業のAWS環境で「TCP/UDP/TLSなど高性能・低遅延のネットワークトラフィックを分散する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Auto Scaling Group",
            "NLB",
            "Health Check",
            "Step Scaling"
        ],
        "answer": 1,
        "explanation": "要件の中心は「TCP/UDP/TLSなど高性能・低遅延のネットワークトラフィックを分散する」です。したがってNLBを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Auto Scaling Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。NLBは、TCP/UDP/TLSなど高性能・低遅延のネットワークトラフィックを分散するための選択肢です。",
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Step Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "NLB",
            "Auto Scaling Group",
            "Health Check",
            "Step Scaling"
        ]
    },
    {
        "id": "q257",
        "category": "ELB / Auto Scaling",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「TCP/UDP/TLSなど高性能・低遅延のネットワークトラフィックを分散する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Step Scaling",
            "Health Check",
            "Target Tracking",
            "NLB"
        ],
        "answer": 3,
        "explanation": "要件の中心は「TCP/UDP/TLSなど高性能・低遅延のネットワークトラフィックを分散する」です。したがってNLBを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Step Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Target Trackingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。NLBは、TCP/UDP/TLSなど高性能・低遅延のネットワークトラフィックを分散するための選択肢です。"
        ],
        "services": [
            "NLB",
            "Step Scaling",
            "Health Check",
            "Target Tracking"
        ]
    },
    {
        "id": "q258",
        "category": "ELB / Auto Scaling",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「TCP/UDP/TLSなど高性能・低遅延のネットワークトラフィックを分散する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Sticky Sessions",
            "Step Scaling",
            "Target Tracking",
            "NLB"
        ],
        "answer": 3,
        "explanation": "要件の中心は「TCP/UDP/TLSなど高性能・低遅延のネットワークトラフィックを分散する」です。したがってNLBを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Sticky Sessionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Step Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Target Trackingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。NLBは、TCP/UDP/TLSなど高性能・低遅延のネットワークトラフィックを分散するための選択肢です。"
        ],
        "services": [
            "NLB",
            "Sticky Sessions",
            "Step Scaling",
            "Target Tracking"
        ]
    },
    {
        "id": "q259",
        "category": "ELB / Auto Scaling",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「TCP/UDP/TLSなど高性能・低遅延のネットワークトラフィックを分散する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Sticky Sessions",
            "NLB",
            "Target Tracking",
            "Cross-Zone Load Balancing"
        ],
        "answer": 1,
        "explanation": "要件の中心は「TCP/UDP/TLSなど高性能・低遅延のネットワークトラフィックを分散する」です。したがってNLBを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Sticky Sessionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。NLBは、TCP/UDP/TLSなど高性能・低遅延のネットワークトラフィックを分散するための選択肢です。",
            "Target Trackingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Cross-Zone Load Balancingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "NLB",
            "Sticky Sessions",
            "Target Tracking",
            "Cross-Zone Load Balancing"
        ]
    },
    {
        "id": "q260",
        "category": "ELB / Auto Scaling",
        "difficulty": "やや難",
        "question": "設計レビューで「TCP/UDP/TLSなど高性能・低遅延のネットワークトラフィックを分散する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "ALB",
            "Cross-Zone Load Balancing",
            "NLB",
            "Sticky Sessions"
        ],
        "answer": 2,
        "explanation": "要件の中心は「TCP/UDP/TLSなど高性能・低遅延のネットワークトラフィックを分散する」です。したがってNLBを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "ALBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Cross-Zone Load Balancingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。NLBは、TCP/UDP/TLSなど高性能・低遅延のネットワークトラフィックを分散するための選択肢です。",
            "Sticky Sessionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "NLB",
            "ALB",
            "Cross-Zone Load Balancing",
            "Sticky Sessions"
        ]
    },
    {
        "id": "q261",
        "category": "ELB / Auto Scaling",
        "difficulty": "標準",
        "question": "企業のAWS環境で「仮想アプライアンスを透過的に挿入してネットワークトラフィックを処理する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "GWLB",
            "Sticky Sessions",
            "Target Tracking",
            "Cross-Zone Load Balancing"
        ],
        "answer": 0,
        "explanation": "要件の中心は「仮想アプライアンスを透過的に挿入してネットワークトラフィックを処理する」です。したがってGWLBを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。GWLBは、仮想アプライアンスを透過的に挿入してネットワークトラフィックを処理するための選択肢です。",
            "Sticky Sessionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Target Trackingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Cross-Zone Load Balancingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "GWLB",
            "Sticky Sessions",
            "Target Tracking",
            "Cross-Zone Load Balancing"
        ]
    },
    {
        "id": "q262",
        "category": "ELB / Auto Scaling",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「仮想アプライアンスを透過的に挿入してネットワークトラフィックを処理する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "GWLB",
            "Sticky Sessions",
            "Cross-Zone Load Balancing",
            "ALB"
        ],
        "answer": 0,
        "explanation": "要件の中心は「仮想アプライアンスを透過的に挿入してネットワークトラフィックを処理する」です。したがってGWLBを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。GWLBは、仮想アプライアンスを透過的に挿入してネットワークトラフィックを処理するための選択肢です。",
            "Sticky Sessionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Cross-Zone Load Balancingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "ALBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "GWLB",
            "Sticky Sessions",
            "Cross-Zone Load Balancing",
            "ALB"
        ]
    },
    {
        "id": "q263",
        "category": "ELB / Auto Scaling",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「仮想アプライアンスを透過的に挿入してネットワークトラフィックを処理する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "GWLB",
            "Cross-Zone Load Balancing",
            "NLB",
            "ALB"
        ],
        "answer": 0,
        "explanation": "要件の中心は「仮想アプライアンスを透過的に挿入してネットワークトラフィックを処理する」です。したがってGWLBを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。GWLBは、仮想アプライアンスを透過的に挿入してネットワークトラフィックを処理するための選択肢です。",
            "Cross-Zone Load Balancingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "NLBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "ALBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "GWLB",
            "Cross-Zone Load Balancing",
            "NLB",
            "ALB"
        ]
    },
    {
        "id": "q264",
        "category": "ELB / Auto Scaling",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「仮想アプライアンスを透過的に挿入してネットワークトラフィックを処理する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Target Group",
            "NLB",
            "GWLB",
            "ALB"
        ],
        "answer": 2,
        "explanation": "要件の中心は「仮想アプライアンスを透過的に挿入してネットワークトラフィックを処理する」です。したがってGWLBを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Target Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "NLBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。GWLBは、仮想アプライアンスを透過的に挿入してネットワークトラフィックを処理するための選択肢です。",
            "ALBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "GWLB",
            "Target Group",
            "NLB",
            "ALB"
        ]
    },
    {
        "id": "q265",
        "category": "ELB / Auto Scaling",
        "difficulty": "やや難",
        "question": "設計レビューで「仮想アプライアンスを透過的に挿入してネットワークトラフィックを処理する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "NLB",
            "GWLB",
            "Auto Scaling Group",
            "Target Group"
        ],
        "answer": 1,
        "explanation": "要件の中心は「仮想アプライアンスを透過的に挿入してネットワークトラフィックを処理する」です。したがってGWLBを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "NLBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。GWLBは、仮想アプライアンスを透過的に挿入してネットワークトラフィックを処理するための選択肢です。",
            "Auto Scaling Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Target Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "GWLB",
            "NLB",
            "Auto Scaling Group",
            "Target Group"
        ]
    },
    {
        "id": "q266",
        "category": "ELB / Auto Scaling",
        "difficulty": "標準",
        "question": "企業のAWS環境で「ロードバランサーからのトラフィック送信先とヘルスチェック設定を管理する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "ALB",
            "Target Group",
            "GWLB",
            "NLB"
        ],
        "answer": 1,
        "explanation": "要件の中心は「ロードバランサーからのトラフィック送信先とヘルスチェック設定を管理する」です。したがってTarget Groupを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "ALBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Target Groupは、ロードバランサーからのトラフィック送信先とヘルスチェック設定を管理するための選択肢です。",
            "GWLBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "NLBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Target Group",
            "ALB",
            "GWLB",
            "NLB"
        ]
    },
    {
        "id": "q267",
        "category": "ELB / Auto Scaling",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「ロードバランサーからのトラフィック送信先とヘルスチェック設定を管理する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "NLB",
            "Target Group",
            "GWLB",
            "Auto Scaling Group"
        ],
        "answer": 1,
        "explanation": "要件の中心は「ロードバランサーからのトラフィック送信先とヘルスチェック設定を管理する」です。したがってTarget Groupを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "NLBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Target Groupは、ロードバランサーからのトラフィック送信先とヘルスチェック設定を管理するための選択肢です。",
            "GWLBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Auto Scaling Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Target Group",
            "NLB",
            "GWLB",
            "Auto Scaling Group"
        ]
    },
    {
        "id": "q268",
        "category": "ELB / Auto Scaling",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「ロードバランサーからのトラフィック送信先とヘルスチェック設定を管理する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Health Check",
            "GWLB",
            "Target Group",
            "Auto Scaling Group"
        ],
        "answer": 2,
        "explanation": "要件の中心は「ロードバランサーからのトラフィック送信先とヘルスチェック設定を管理する」です。したがってTarget Groupを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "GWLBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Target Groupは、ロードバランサーからのトラフィック送信先とヘルスチェック設定を管理するための選択肢です。",
            "Auto Scaling Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Target Group",
            "Health Check",
            "GWLB",
            "Auto Scaling Group"
        ]
    },
    {
        "id": "q269",
        "category": "ELB / Auto Scaling",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「ロードバランサーからのトラフィック送信先とヘルスチェック設定を管理する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Step Scaling",
            "Target Group",
            "Health Check",
            "Auto Scaling Group"
        ],
        "answer": 1,
        "explanation": "要件の中心は「ロードバランサーからのトラフィック送信先とヘルスチェック設定を管理する」です。したがってTarget Groupを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Step Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Target Groupは、ロードバランサーからのトラフィック送信先とヘルスチェック設定を管理するための選択肢です。",
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Auto Scaling Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Target Group",
            "Step Scaling",
            "Health Check",
            "Auto Scaling Group"
        ]
    },
    {
        "id": "q270",
        "category": "ELB / Auto Scaling",
        "difficulty": "やや難",
        "question": "設計レビューで「ロードバランサーからのトラフィック送信先とヘルスチェック設定を管理する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Target Tracking",
            "Step Scaling",
            "Health Check",
            "Target Group"
        ],
        "answer": 3,
        "explanation": "要件の中心は「ロードバランサーからのトラフィック送信先とヘルスチェック設定を管理する」です。したがってTarget Groupを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Target Trackingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Step Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Target Groupは、ロードバランサーからのトラフィック送信先とヘルスチェック設定を管理するための選択肢です。"
        ],
        "services": [
            "Target Group",
            "Target Tracking",
            "Step Scaling",
            "Health Check"
        ]
    },
    {
        "id": "q271",
        "category": "ELB / Auto Scaling",
        "difficulty": "標準",
        "question": "企業のAWS環境で「EC2インスタンスを希望・最小・最大容量で維持し異常インスタンスを置換する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Auto Scaling Group",
            "Health Check",
            "Step Scaling",
            "Target Group"
        ],
        "answer": 0,
        "explanation": "要件の中心は「EC2インスタンスを希望・最小・最大容量で維持し異常インスタンスを置換する」です。したがってAuto Scaling Groupを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Auto Scaling Groupは、EC2インスタンスを希望・最小・最大容量で維持し異常インスタンスを置換するための選択肢です。",
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Step Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Target Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Auto Scaling Group",
            "Health Check",
            "Step Scaling",
            "Target Group"
        ]
    },
    {
        "id": "q272",
        "category": "ELB / Auto Scaling",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「EC2インスタンスを希望・最小・最大容量で維持し異常インスタンスを置換する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Step Scaling",
            "Target Tracking",
            "Auto Scaling Group",
            "Health Check"
        ],
        "answer": 2,
        "explanation": "要件の中心は「EC2インスタンスを希望・最小・最大容量で維持し異常インスタンスを置換する」です。したがってAuto Scaling Groupを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Step Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Target Trackingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Auto Scaling Groupは、EC2インスタンスを希望・最小・最大容量で維持し異常インスタンスを置換するための選択肢です。",
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Auto Scaling Group",
            "Step Scaling",
            "Target Tracking",
            "Health Check"
        ]
    },
    {
        "id": "q273",
        "category": "ELB / Auto Scaling",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「EC2インスタンスを希望・最小・最大容量で維持し異常インスタンスを置換する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Auto Scaling Group",
            "Sticky Sessions",
            "Step Scaling",
            "Target Tracking"
        ],
        "answer": 0,
        "explanation": "要件の中心は「EC2インスタンスを希望・最小・最大容量で維持し異常インスタンスを置換する」です。したがってAuto Scaling Groupを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Auto Scaling Groupは、EC2インスタンスを希望・最小・最大容量で維持し異常インスタンスを置換するための選択肢です。",
            "Sticky Sessionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Step Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Target Trackingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Auto Scaling Group",
            "Sticky Sessions",
            "Step Scaling",
            "Target Tracking"
        ]
    },
    {
        "id": "q274",
        "category": "ELB / Auto Scaling",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「EC2インスタンスを希望・最小・最大容量で維持し異常インスタンスを置換する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Sticky Sessions",
            "Auto Scaling Group",
            "Target Tracking",
            "Cross-Zone Load Balancing"
        ],
        "answer": 1,
        "explanation": "要件の中心は「EC2インスタンスを希望・最小・最大容量で維持し異常インスタンスを置換する」です。したがってAuto Scaling Groupを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Sticky Sessionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Auto Scaling Groupは、EC2インスタンスを希望・最小・最大容量で維持し異常インスタンスを置換するための選択肢です。",
            "Target Trackingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Cross-Zone Load Balancingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Auto Scaling Group",
            "Sticky Sessions",
            "Target Tracking",
            "Cross-Zone Load Balancing"
        ]
    },
    {
        "id": "q275",
        "category": "ELB / Auto Scaling",
        "difficulty": "やや難",
        "question": "設計レビューで「EC2インスタンスを希望・最小・最大容量で維持し異常インスタンスを置換する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Cross-Zone Load Balancing",
            "ALB",
            "Auto Scaling Group",
            "Sticky Sessions"
        ],
        "answer": 2,
        "explanation": "要件の中心は「EC2インスタンスを希望・最小・最大容量で維持し異常インスタンスを置換する」です。したがってAuto Scaling Groupを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Cross-Zone Load Balancingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "ALBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Auto Scaling Groupは、EC2インスタンスを希望・最小・最大容量で維持し異常インスタンスを置換するための選択肢です。",
            "Sticky Sessionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Auto Scaling Group",
            "Cross-Zone Load Balancing",
            "ALB",
            "Sticky Sessions"
        ]
    },
    {
        "id": "q276",
        "category": "ELB / Auto Scaling",
        "difficulty": "標準",
        "question": "企業のAWS環境で「異常なターゲットへトラフィックを送らないよう定期的に健全性を確認する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Cross-Zone Load Balancing",
            "Health Check",
            "Sticky Sessions",
            "Target Tracking"
        ],
        "answer": 1,
        "explanation": "要件の中心は「異常なターゲットへトラフィックを送らないよう定期的に健全性を確認する」です。したがってHealth Checkを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Cross-Zone Load Balancingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Health Checkは、異常なターゲットへトラフィックを送らないよう定期的に健全性を確認するための選択肢です。",
            "Sticky Sessionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Target Trackingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Health Check",
            "Cross-Zone Load Balancing",
            "Sticky Sessions",
            "Target Tracking"
        ]
    },
    {
        "id": "q277",
        "category": "ELB / Auto Scaling",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「異常なターゲットへトラフィックを送らないよう定期的に健全性を確認する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Cross-Zone Load Balancing",
            "ALB",
            "Health Check",
            "Sticky Sessions"
        ],
        "answer": 2,
        "explanation": "要件の中心は「異常なターゲットへトラフィックを送らないよう定期的に健全性を確認する」です。したがってHealth Checkを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Cross-Zone Load Balancingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "ALBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Health Checkは、異常なターゲットへトラフィックを送らないよう定期的に健全性を確認するための選択肢です。",
            "Sticky Sessionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Health Check",
            "Cross-Zone Load Balancing",
            "ALB",
            "Sticky Sessions"
        ]
    },
    {
        "id": "q278",
        "category": "ELB / Auto Scaling",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「異常なターゲットへトラフィックを送らないよう定期的に健全性を確認する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "NLB",
            "Cross-Zone Load Balancing",
            "ALB",
            "Health Check"
        ],
        "answer": 3,
        "explanation": "要件の中心は「異常なターゲットへトラフィックを送らないよう定期的に健全性を確認する」です。したがってHealth Checkを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "NLBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Cross-Zone Load Balancingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "ALBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Health Checkは、異常なターゲットへトラフィックを送らないよう定期的に健全性を確認するための選択肢です。"
        ],
        "services": [
            "Health Check",
            "NLB",
            "Cross-Zone Load Balancing",
            "ALB"
        ]
    },
    {
        "id": "q279",
        "category": "ELB / Auto Scaling",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「異常なターゲットへトラフィックを送らないよう定期的に健全性を確認する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Health Check",
            "ALB",
            "NLB",
            "GWLB"
        ],
        "answer": 0,
        "explanation": "要件の中心は「異常なターゲットへトラフィックを送らないよう定期的に健全性を確認する」です。したがってHealth Checkを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Health Checkは、異常なターゲットへトラフィックを送らないよう定期的に健全性を確認するための選択肢です。",
            "ALBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "NLBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "GWLBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Health Check",
            "ALB",
            "NLB",
            "GWLB"
        ]
    },
    {
        "id": "q280",
        "category": "ELB / Auto Scaling",
        "difficulty": "やや難",
        "question": "設計レビューで「異常なターゲットへトラフィックを送らないよう定期的に健全性を確認する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "GWLB",
            "Target Group",
            "NLB",
            "Health Check"
        ],
        "answer": 3,
        "explanation": "要件の中心は「異常なターゲットへトラフィックを送らないよう定期的に健全性を確認する」です。したがってHealth Checkを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "GWLBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Target Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "NLBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Health Checkは、異常なターゲットへトラフィックを送らないよう定期的に健全性を確認するための選択肢です。"
        ],
        "services": [
            "Health Check",
            "GWLB",
            "Target Group",
            "NLB"
        ]
    },
    {
        "id": "q281",
        "category": "ELB / Auto Scaling",
        "difficulty": "標準",
        "question": "企業のAWS環境で「メトリクスの閾値に応じて段階的にEC2容量を増減させる」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Step Scaling",
            "NLB",
            "ALB",
            "GWLB"
        ],
        "answer": 0,
        "explanation": "要件の中心は「メトリクスの閾値に応じて段階的にEC2容量を増減させる」です。したがってStep Scalingを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Step Scalingは、メトリクスの閾値に応じて段階的にEC2容量を増減させるための選択肢です。",
            "NLBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "ALBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "GWLBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Step Scaling",
            "NLB",
            "ALB",
            "GWLB"
        ]
    },
    {
        "id": "q282",
        "category": "ELB / Auto Scaling",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「メトリクスの閾値に応じて段階的にEC2容量を増減させる」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "NLB",
            "Step Scaling",
            "GWLB",
            "Target Group"
        ],
        "answer": 1,
        "explanation": "要件の中心は「メトリクスの閾値に応じて段階的にEC2容量を増減させる」です。したがってStep Scalingを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "NLBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Step Scalingは、メトリクスの閾値に応じて段階的にEC2容量を増減させるための選択肢です。",
            "GWLBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Target Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Step Scaling",
            "NLB",
            "GWLB",
            "Target Group"
        ]
    },
    {
        "id": "q283",
        "category": "ELB / Auto Scaling",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「メトリクスの閾値に応じて段階的にEC2容量を増減させる」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "GWLB",
            "Step Scaling",
            "Auto Scaling Group",
            "Target Group"
        ],
        "answer": 1,
        "explanation": "要件の中心は「メトリクスの閾値に応じて段階的にEC2容量を増減させる」です。したがってStep Scalingを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "GWLBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Step Scalingは、メトリクスの閾値に応じて段階的にEC2容量を増減させるための選択肢です。",
            "Auto Scaling Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Target Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Step Scaling",
            "GWLB",
            "Auto Scaling Group",
            "Target Group"
        ]
    },
    {
        "id": "q284",
        "category": "ELB / Auto Scaling",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「メトリクスの閾値に応じて段階的にEC2容量を増減させる」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Step Scaling",
            "Target Group",
            "Auto Scaling Group",
            "Health Check"
        ],
        "answer": 0,
        "explanation": "要件の中心は「メトリクスの閾値に応じて段階的にEC2容量を増減させる」です。したがってStep Scalingを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Step Scalingは、メトリクスの閾値に応じて段階的にEC2容量を増減させるための選択肢です。",
            "Target Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Auto Scaling Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Step Scaling",
            "Target Group",
            "Auto Scaling Group",
            "Health Check"
        ]
    },
    {
        "id": "q285",
        "category": "ELB / Auto Scaling",
        "difficulty": "やや難",
        "question": "設計レビューで「メトリクスの閾値に応じて段階的にEC2容量を増減させる」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Health Check",
            "Auto Scaling Group",
            "Target Tracking",
            "Step Scaling"
        ],
        "answer": 3,
        "explanation": "要件の中心は「メトリクスの閾値に応じて段階的にEC2容量を増減させる」です。したがってStep Scalingを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Auto Scaling Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Target Trackingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Step Scalingは、メトリクスの閾値に応じて段階的にEC2容量を増減させるための選択肢です。"
        ],
        "services": [
            "Step Scaling",
            "Health Check",
            "Auto Scaling Group",
            "Target Tracking"
        ]
    },
    {
        "id": "q286",
        "category": "ELB / Auto Scaling",
        "difficulty": "標準",
        "question": "企業のAWS環境で「CPU使用率などの目標値を維持するようAuto Scalingを自動調整する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Target Group",
            "Health Check",
            "Target Tracking",
            "Auto Scaling Group"
        ],
        "answer": 2,
        "explanation": "要件の中心は「CPU使用率などの目標値を維持するようAuto Scalingを自動調整する」です。したがってTarget Trackingを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Target Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Target Trackingは、CPU使用率などの目標値を維持するようAuto Scalingを自動調整するための選択肢です。",
            "Auto Scaling Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Target Tracking",
            "Target Group",
            "Health Check",
            "Auto Scaling Group"
        ]
    },
    {
        "id": "q287",
        "category": "ELB / Auto Scaling",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「CPU使用率などの目標値を維持するようAuto Scalingを自動調整する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Auto Scaling Group",
            "Step Scaling",
            "Health Check",
            "Target Tracking"
        ],
        "answer": 3,
        "explanation": "要件の中心は「CPU使用率などの目標値を維持するようAuto Scalingを自動調整する」です。したがってTarget Trackingを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Auto Scaling Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Step Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Target Trackingは、CPU使用率などの目標値を維持するようAuto Scalingを自動調整するための選択肢です。"
        ],
        "services": [
            "Target Tracking",
            "Auto Scaling Group",
            "Step Scaling",
            "Health Check"
        ]
    },
    {
        "id": "q288",
        "category": "ELB / Auto Scaling",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「CPU使用率などの目標値を維持するようAuto Scalingを自動調整する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Health Check",
            "Sticky Sessions",
            "Target Tracking",
            "Step Scaling"
        ],
        "answer": 2,
        "explanation": "要件の中心は「CPU使用率などの目標値を維持するようAuto Scalingを自動調整する」です。したがってTarget Trackingを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Sticky Sessionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Target Trackingは、CPU使用率などの目標値を維持するようAuto Scalingを自動調整するための選択肢です。",
            "Step Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Target Tracking",
            "Health Check",
            "Sticky Sessions",
            "Step Scaling"
        ]
    },
    {
        "id": "q289",
        "category": "ELB / Auto Scaling",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「CPU使用率などの目標値を維持するようAuto Scalingを自動調整する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Step Scaling",
            "Target Tracking",
            "Cross-Zone Load Balancing",
            "Sticky Sessions"
        ],
        "answer": 1,
        "explanation": "要件の中心は「CPU使用率などの目標値を維持するようAuto Scalingを自動調整する」です。したがってTarget Trackingを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Step Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Target Trackingは、CPU使用率などの目標値を維持するようAuto Scalingを自動調整するための選択肢です。",
            "Cross-Zone Load Balancingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Sticky Sessionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Target Tracking",
            "Step Scaling",
            "Cross-Zone Load Balancing",
            "Sticky Sessions"
        ]
    },
    {
        "id": "q290",
        "category": "ELB / Auto Scaling",
        "difficulty": "やや難",
        "question": "設計レビューで「CPU使用率などの目標値を維持するようAuto Scalingを自動調整する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Target Tracking",
            "ALB",
            "Sticky Sessions",
            "Cross-Zone Load Balancing"
        ],
        "answer": 0,
        "explanation": "要件の中心は「CPU使用率などの目標値を維持するようAuto Scalingを自動調整する」です。したがってTarget Trackingを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Target Trackingは、CPU使用率などの目標値を維持するようAuto Scalingを自動調整するための選択肢です。",
            "ALBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Sticky Sessionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Cross-Zone Load Balancingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Target Tracking",
            "ALB",
            "Sticky Sessions",
            "Cross-Zone Load Balancing"
        ]
    },
    {
        "id": "q291",
        "category": "ELB / Auto Scaling",
        "difficulty": "標準",
        "question": "企業のAWS環境で「同一ユーザーのリクエストを同じターゲットへ送るセッション維持を行う」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Step Scaling",
            "Target Tracking",
            "Cross-Zone Load Balancing",
            "Sticky Sessions"
        ],
        "answer": 3,
        "explanation": "要件の中心は「同一ユーザーのリクエストを同じターゲットへ送るセッション維持を行う」です。したがってSticky Sessionsを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Step Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Target Trackingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Cross-Zone Load Balancingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Sticky Sessionsは、同一ユーザーのリクエストを同じターゲットへ送るセッション維持を行うための選択肢です。"
        ],
        "services": [
            "Sticky Sessions",
            "Step Scaling",
            "Target Tracking",
            "Cross-Zone Load Balancing"
        ]
    },
    {
        "id": "q292",
        "category": "ELB / Auto Scaling",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「同一ユーザーのリクエストを同じターゲットへ送るセッション維持を行う」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Sticky Sessions",
            "Cross-Zone Load Balancing",
            "ALB",
            "Target Tracking"
        ],
        "answer": 0,
        "explanation": "要件の中心は「同一ユーザーのリクエストを同じターゲットへ送るセッション維持を行う」です。したがってSticky Sessionsを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Sticky Sessionsは、同一ユーザーのリクエストを同じターゲットへ送るセッション維持を行うための選択肢です。",
            "Cross-Zone Load Balancingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "ALBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Target Trackingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Sticky Sessions",
            "Cross-Zone Load Balancing",
            "ALB",
            "Target Tracking"
        ]
    },
    {
        "id": "q293",
        "category": "ELB / Auto Scaling",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「同一ユーザーのリクエストを同じターゲットへ送るセッション維持を行う」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "ALB",
            "Cross-Zone Load Balancing",
            "Sticky Sessions",
            "NLB"
        ],
        "answer": 2,
        "explanation": "要件の中心は「同一ユーザーのリクエストを同じターゲットへ送るセッション維持を行う」です。したがってSticky Sessionsを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "ALBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Cross-Zone Load Balancingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Sticky Sessionsは、同一ユーザーのリクエストを同じターゲットへ送るセッション維持を行うための選択肢です。",
            "NLBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Sticky Sessions",
            "ALB",
            "Cross-Zone Load Balancing",
            "NLB"
        ]
    },
    {
        "id": "q294",
        "category": "ELB / Auto Scaling",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「同一ユーザーのリクエストを同じターゲットへ送るセッション維持を行う」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "NLB",
            "GWLB",
            "ALB",
            "Sticky Sessions"
        ],
        "answer": 3,
        "explanation": "要件の中心は「同一ユーザーのリクエストを同じターゲットへ送るセッション維持を行う」です。したがってSticky Sessionsを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "NLBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "GWLBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "ALBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Sticky Sessionsは、同一ユーザーのリクエストを同じターゲットへ送るセッション維持を行うための選択肢です。"
        ],
        "services": [
            "Sticky Sessions",
            "NLB",
            "GWLB",
            "ALB"
        ]
    },
    {
        "id": "q295",
        "category": "ELB / Auto Scaling",
        "difficulty": "やや難",
        "question": "設計レビューで「同一ユーザーのリクエストを同じターゲットへ送るセッション維持を行う」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Target Group",
            "Sticky Sessions",
            "NLB",
            "GWLB"
        ],
        "answer": 1,
        "explanation": "要件の中心は「同一ユーザーのリクエストを同じターゲットへ送るセッション維持を行う」です。したがってSticky Sessionsを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Target Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Sticky Sessionsは、同一ユーザーのリクエストを同じターゲットへ送るセッション維持を行うための選択肢です。",
            "NLBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "GWLBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Sticky Sessions",
            "Target Group",
            "NLB",
            "GWLB"
        ]
    },
    {
        "id": "q296",
        "category": "ELB / Auto Scaling",
        "difficulty": "標準",
        "question": "企業のAWS環境で「複数AZのターゲットへロードバランサーから均等に分散する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "ALB",
            "NLB",
            "GWLB",
            "Cross-Zone Load Balancing"
        ],
        "answer": 3,
        "explanation": "要件の中心は「複数AZのターゲットへロードバランサーから均等に分散する」です。したがってCross-Zone Load Balancingを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "ALBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "NLBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "GWLBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Cross-Zone Load Balancingは、複数AZのターゲットへロードバランサーから均等に分散するための選択肢です。"
        ],
        "services": [
            "Cross-Zone Load Balancing",
            "ALB",
            "NLB",
            "GWLB"
        ]
    },
    {
        "id": "q297",
        "category": "ELB / Auto Scaling",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「複数AZのターゲットへロードバランサーから均等に分散する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "GWLB",
            "NLB",
            "Cross-Zone Load Balancing",
            "Target Group"
        ],
        "answer": 2,
        "explanation": "要件の中心は「複数AZのターゲットへロードバランサーから均等に分散する」です。したがってCross-Zone Load Balancingを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "GWLBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "NLBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Cross-Zone Load Balancingは、複数AZのターゲットへロードバランサーから均等に分散するための選択肢です。",
            "Target Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Cross-Zone Load Balancing",
            "GWLB",
            "NLB",
            "Target Group"
        ]
    },
    {
        "id": "q298",
        "category": "ELB / Auto Scaling",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「複数AZのターゲットへロードバランサーから均等に分散する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Target Group",
            "GWLB",
            "Auto Scaling Group",
            "Cross-Zone Load Balancing"
        ],
        "answer": 3,
        "explanation": "要件の中心は「複数AZのターゲットへロードバランサーから均等に分散する」です。したがってCross-Zone Load Balancingを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Target Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "GWLBは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Auto Scaling Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Cross-Zone Load Balancingは、複数AZのターゲットへロードバランサーから均等に分散するための選択肢です。"
        ],
        "services": [
            "Cross-Zone Load Balancing",
            "Target Group",
            "GWLB",
            "Auto Scaling Group"
        ]
    },
    {
        "id": "q299",
        "category": "ELB / Auto Scaling",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「複数AZのターゲットへロードバランサーから均等に分散する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Health Check",
            "Cross-Zone Load Balancing",
            "Target Group",
            "Auto Scaling Group"
        ],
        "answer": 1,
        "explanation": "要件の中心は「複数AZのターゲットへロードバランサーから均等に分散する」です。したがってCross-Zone Load Balancingを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Cross-Zone Load Balancingは、複数AZのターゲットへロードバランサーから均等に分散するための選択肢です。",
            "Target Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Auto Scaling Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Cross-Zone Load Balancing",
            "Health Check",
            "Target Group",
            "Auto Scaling Group"
        ]
    },
    {
        "id": "q300",
        "category": "ELB / Auto Scaling",
        "difficulty": "やや難",
        "question": "設計レビューで「複数AZのターゲットへロードバランサーから均等に分散する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Step Scaling",
            "Auto Scaling Group",
            "Cross-Zone Load Balancing",
            "Health Check"
        ],
        "answer": 2,
        "explanation": "要件の中心は「複数AZのターゲットへロードバランサーから均等に分散する」です。したがってCross-Zone Load Balancingを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Step Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Auto Scaling Groupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Cross-Zone Load Balancingは、複数AZのターゲットへロードバランサーから均等に分散するための選択肢です。",
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Cross-Zone Load Balancing",
            "Step Scaling",
            "Auto Scaling Group",
            "Health Check"
        ]
    },
    {
        "id": "q301",
        "category": "CloudFront / Route 53",
        "difficulty": "標準",
        "question": "企業のAWS環境で「エッジロケーションを利用してWebコンテンツを世界中へ低レイテンシ配信する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Route 53",
            "Route 53 Weighted",
            "Route 53 Failover",
            "CloudFront"
        ],
        "answer": 3,
        "explanation": "要件の中心は「エッジロケーションを利用してWebコンテンツを世界中へ低レイテンシ配信する」です。したがってCloudFrontを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53 Weightedは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53 Failoverは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。CloudFrontは、エッジロケーションを利用してWebコンテンツを世界中へ低レイテンシ配信するための選択肢です。"
        ],
        "services": [
            "CloudFront",
            "Route 53",
            "Route 53 Weighted",
            "Route 53 Failover"
        ]
    },
    {
        "id": "q302",
        "category": "CloudFront / Route 53",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「エッジロケーションを利用してWebコンテンツを世界中へ低レイテンシ配信する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Route 53 Weighted",
            "Route 53 Failover",
            "CloudFront",
            "Route 53 Latency"
        ],
        "answer": 2,
        "explanation": "要件の中心は「エッジロケーションを利用してWebコンテンツを世界中へ低レイテンシ配信する」です。したがってCloudFrontを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Route 53 Weightedは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53 Failoverは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。CloudFrontは、エッジロケーションを利用してWebコンテンツを世界中へ低レイテンシ配信するための選択肢です。",
            "Route 53 Latencyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "CloudFront",
            "Route 53 Weighted",
            "Route 53 Failover",
            "Route 53 Latency"
        ]
    },
    {
        "id": "q303",
        "category": "CloudFront / Route 53",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「エッジロケーションを利用してWebコンテンツを世界中へ低レイテンシ配信する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Route 53 Geolocation",
            "Route 53 Latency",
            "CloudFront",
            "Route 53 Weighted"
        ],
        "answer": 2,
        "explanation": "要件の中心は「エッジロケーションを利用してWebコンテンツを世界中へ低レイテンシ配信する」です。したがってCloudFrontを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Route 53 Geolocationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53 Latencyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。CloudFrontは、エッジロケーションを利用してWebコンテンツを世界中へ低レイテンシ配信するための選択肢です。",
            "Route 53 Weightedは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "CloudFront",
            "Route 53 Geolocation",
            "Route 53 Latency",
            "Route 53 Weighted"
        ]
    },
    {
        "id": "q304",
        "category": "CloudFront / Route 53",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「エッジロケーションを利用してWebコンテンツを世界中へ低レイテンシ配信する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Route 53 Geolocation",
            "CloudFront",
            "Origin Shield",
            "Route 53 Latency"
        ],
        "answer": 1,
        "explanation": "要件の中心は「エッジロケーションを利用してWebコンテンツを世界中へ低レイテンシ配信する」です。したがってCloudFrontを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Route 53 Geolocationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。CloudFrontは、エッジロケーションを利用してWebコンテンツを世界中へ低レイテンシ配信するための選択肢です。",
            "Origin Shieldは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53 Latencyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "CloudFront",
            "Route 53 Geolocation",
            "Origin Shield",
            "Route 53 Latency"
        ]
    },
    {
        "id": "q305",
        "category": "CloudFront / Route 53",
        "difficulty": "やや難",
        "question": "設計レビューで「エッジロケーションを利用してWebコンテンツを世界中へ低レイテンシ配信する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Origin Shield",
            "CloudFront",
            "Route 53 Geolocation",
            "Signed URL"
        ],
        "answer": 1,
        "explanation": "要件の中心は「エッジロケーションを利用してWebコンテンツを世界中へ低レイテンシ配信する」です。したがってCloudFrontを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Origin Shieldは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。CloudFrontは、エッジロケーションを利用してWebコンテンツを世界中へ低レイテンシ配信するための選択肢です。",
            "Route 53 Geolocationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Signed URLは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "CloudFront",
            "Origin Shield",
            "Route 53 Geolocation",
            "Signed URL"
        ]
    },
    {
        "id": "q306",
        "category": "CloudFront / Route 53",
        "difficulty": "標準",
        "question": "企業のAWS環境で「DNS名前解決とドメイン管理、DNSベースのルーティングを提供する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Route 53",
            "Route 53 Geolocation",
            "Route 53 Latency",
            "Origin Shield"
        ],
        "answer": 0,
        "explanation": "要件の中心は「DNS名前解決とドメイン管理、DNSベースのルーティングを提供する」です。したがってRoute 53を選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Route 53は、DNS名前解決とドメイン管理、DNSベースのルーティングを提供するための選択肢です。",
            "Route 53 Geolocationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53 Latencyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Origin Shieldは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Route 53",
            "Route 53 Geolocation",
            "Route 53 Latency",
            "Origin Shield"
        ]
    },
    {
        "id": "q307",
        "category": "CloudFront / Route 53",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「DNS名前解決とドメイン管理、DNSベースのルーティングを提供する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Route 53 Geolocation",
            "Origin Shield",
            "Route 53",
            "Signed URL"
        ],
        "answer": 2,
        "explanation": "要件の中心は「DNS名前解決とドメイン管理、DNSベースのルーティングを提供する」です。したがってRoute 53を選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Route 53 Geolocationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Origin Shieldは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Route 53は、DNS名前解決とドメイン管理、DNSベースのルーティングを提供するための選択肢です。",
            "Signed URLは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Route 53",
            "Route 53 Geolocation",
            "Origin Shield",
            "Signed URL"
        ]
    },
    {
        "id": "q308",
        "category": "CloudFront / Route 53",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「DNS名前解決とドメイン管理、DNSベースのルーティングを提供する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Route 53",
            "Origin Shield",
            "CloudFront Functions",
            "Signed URL"
        ],
        "answer": 0,
        "explanation": "要件の中心は「DNS名前解決とドメイン管理、DNSベースのルーティングを提供する」です。したがってRoute 53を選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Route 53は、DNS名前解決とドメイン管理、DNSベースのルーティングを提供するための選択肢です。",
            "Origin Shieldは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "CloudFront Functionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Signed URLは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Route 53",
            "Origin Shield",
            "CloudFront Functions",
            "Signed URL"
        ]
    },
    {
        "id": "q309",
        "category": "CloudFront / Route 53",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「DNS名前解決とドメイン管理、DNSベースのルーティングを提供する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Signed URL",
            "CloudFront Functions",
            "WAF",
            "Route 53"
        ],
        "answer": 3,
        "explanation": "要件の中心は「DNS名前解決とドメイン管理、DNSベースのルーティングを提供する」です。したがってRoute 53を選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Signed URLは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "CloudFront Functionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "WAFは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Route 53は、DNS名前解決とドメイン管理、DNSベースのルーティングを提供するための選択肢です。"
        ],
        "services": [
            "Route 53",
            "Signed URL",
            "CloudFront Functions",
            "WAF"
        ]
    },
    {
        "id": "q310",
        "category": "CloudFront / Route 53",
        "difficulty": "やや難",
        "question": "設計レビューで「DNS名前解決とドメイン管理、DNSベースのルーティングを提供する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "CloudFront",
            "Route 53",
            "WAF",
            "CloudFront Functions"
        ],
        "answer": 1,
        "explanation": "要件の中心は「DNS名前解決とドメイン管理、DNSベースのルーティングを提供する」です。したがってRoute 53を選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "CloudFrontは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Route 53は、DNS名前解決とドメイン管理、DNSベースのルーティングを提供するための選択肢です。",
            "WAFは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "CloudFront Functionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Route 53",
            "CloudFront",
            "WAF",
            "CloudFront Functions"
        ]
    },
    {
        "id": "q311",
        "category": "CloudFront / Route 53",
        "difficulty": "標準",
        "question": "企業のAWS環境で「プライマリ障害時にセカンダリへDNSルーティングを切り替える」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Route 53 Failover",
            "WAF",
            "CloudFront Functions",
            "Signed URL"
        ],
        "answer": 0,
        "explanation": "要件の中心は「プライマリ障害時にセカンダリへDNSルーティングを切り替える」です。したがってRoute 53 Failoverを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Route 53 Failoverは、プライマリ障害時にセカンダリへDNSルーティングを切り替えるための選択肢です。",
            "WAFは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "CloudFront Functionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Signed URLは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Route 53 Failover",
            "WAF",
            "CloudFront Functions",
            "Signed URL"
        ]
    },
    {
        "id": "q312",
        "category": "CloudFront / Route 53",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「プライマリ障害時にセカンダリへDNSルーティングを切り替える」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Route 53 Failover",
            "CloudFront Functions",
            "WAF",
            "CloudFront"
        ],
        "answer": 0,
        "explanation": "要件の中心は「プライマリ障害時にセカンダリへDNSルーティングを切り替える」です。したがってRoute 53 Failoverを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Route 53 Failoverは、プライマリ障害時にセカンダリへDNSルーティングを切り替えるための選択肢です。",
            "CloudFront Functionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "WAFは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "CloudFrontは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Route 53 Failover",
            "CloudFront Functions",
            "WAF",
            "CloudFront"
        ]
    },
    {
        "id": "q313",
        "category": "CloudFront / Route 53",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「プライマリ障害時にセカンダリへDNSルーティングを切り替える」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "WAF",
            "Route 53 Failover",
            "Route 53",
            "CloudFront"
        ],
        "answer": 1,
        "explanation": "要件の中心は「プライマリ障害時にセカンダリへDNSルーティングを切り替える」です。したがってRoute 53 Failoverを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "WAFは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Route 53 Failoverは、プライマリ障害時にセカンダリへDNSルーティングを切り替えるための選択肢です。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "CloudFrontは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Route 53 Failover",
            "WAF",
            "Route 53",
            "CloudFront"
        ]
    },
    {
        "id": "q314",
        "category": "CloudFront / Route 53",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「プライマリ障害時にセカンダリへDNSルーティングを切り替える」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "CloudFront",
            "Route 53",
            "Route 53 Weighted",
            "Route 53 Failover"
        ],
        "answer": 3,
        "explanation": "要件の中心は「プライマリ障害時にセカンダリへDNSルーティングを切り替える」です。したがってRoute 53 Failoverを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "CloudFrontは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53 Weightedは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Route 53 Failoverは、プライマリ障害時にセカンダリへDNSルーティングを切り替えるための選択肢です。"
        ],
        "services": [
            "Route 53 Failover",
            "CloudFront",
            "Route 53",
            "Route 53 Weighted"
        ]
    },
    {
        "id": "q315",
        "category": "CloudFront / Route 53",
        "difficulty": "やや難",
        "question": "設計レビューで「プライマリ障害時にセカンダリへDNSルーティングを切り替える」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Route 53 Weighted",
            "Route 53 Latency",
            "Route 53 Failover",
            "Route 53"
        ],
        "answer": 2,
        "explanation": "要件の中心は「プライマリ障害時にセカンダリへDNSルーティングを切り替える」です。したがってRoute 53 Failoverを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Route 53 Weightedは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53 Latencyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Route 53 Failoverは、プライマリ障害時にセカンダリへDNSルーティングを切り替えるための選択肢です。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Route 53 Failover",
            "Route 53 Weighted",
            "Route 53 Latency",
            "Route 53"
        ]
    },
    {
        "id": "q316",
        "category": "CloudFront / Route 53",
        "difficulty": "標準",
        "question": "企業のAWS環境で「重み付けに基づいて複数エンドポイントへDNSトラフィックを分配する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Route 53 Failover",
            "Route 53 Weighted",
            "Route 53",
            "CloudFront"
        ],
        "answer": 1,
        "explanation": "要件の中心は「重み付けに基づいて複数エンドポイントへDNSトラフィックを分配する」です。したがってRoute 53 Weightedを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Route 53 Failoverは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Route 53 Weightedは、重み付けに基づいて複数エンドポイントへDNSトラフィックを分配するための選択肢です。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "CloudFrontは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Route 53 Weighted",
            "Route 53 Failover",
            "Route 53",
            "CloudFront"
        ]
    },
    {
        "id": "q317",
        "category": "CloudFront / Route 53",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「重み付けに基づいて複数エンドポイントへDNSトラフィックを分配する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Route 53",
            "Route 53 Latency",
            "Route 53 Weighted",
            "Route 53 Failover"
        ],
        "answer": 2,
        "explanation": "要件の中心は「重み付けに基づいて複数エンドポイントへDNSトラフィックを分配する」です。したがってRoute 53 Weightedを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53 Latencyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Route 53 Weightedは、重み付けに基づいて複数エンドポイントへDNSトラフィックを分配するための選択肢です。",
            "Route 53 Failoverは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Route 53 Weighted",
            "Route 53",
            "Route 53 Latency",
            "Route 53 Failover"
        ]
    },
    {
        "id": "q318",
        "category": "CloudFront / Route 53",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「重み付けに基づいて複数エンドポイントへDNSトラフィックを分配する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Route 53 Latency",
            "Route 53 Weighted",
            "Route 53 Geolocation",
            "Route 53 Failover"
        ],
        "answer": 1,
        "explanation": "要件の中心は「重み付けに基づいて複数エンドポイントへDNSトラフィックを分配する」です。したがってRoute 53 Weightedを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Route 53 Latencyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Route 53 Weightedは、重み付けに基づいて複数エンドポイントへDNSトラフィックを分配するための選択肢です。",
            "Route 53 Geolocationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53 Failoverは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Route 53 Weighted",
            "Route 53 Latency",
            "Route 53 Geolocation",
            "Route 53 Failover"
        ]
    },
    {
        "id": "q319",
        "category": "CloudFront / Route 53",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「重み付けに基づいて複数エンドポイントへDNSトラフィックを分配する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Route 53 Weighted",
            "Route 53 Geolocation",
            "Route 53 Latency",
            "Origin Shield"
        ],
        "answer": 0,
        "explanation": "要件の中心は「重み付けに基づいて複数エンドポイントへDNSトラフィックを分配する」です。したがってRoute 53 Weightedを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Route 53 Weightedは、重み付けに基づいて複数エンドポイントへDNSトラフィックを分配するための選択肢です。",
            "Route 53 Geolocationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53 Latencyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Origin Shieldは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Route 53 Weighted",
            "Route 53 Geolocation",
            "Route 53 Latency",
            "Origin Shield"
        ]
    },
    {
        "id": "q320",
        "category": "CloudFront / Route 53",
        "difficulty": "やや難",
        "question": "設計レビューで「重み付けに基づいて複数エンドポイントへDNSトラフィックを分配する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Route 53 Weighted",
            "Signed URL",
            "Origin Shield",
            "Route 53 Geolocation"
        ],
        "answer": 0,
        "explanation": "要件の中心は「重み付けに基づいて複数エンドポイントへDNSトラフィックを分配する」です。したがってRoute 53 Weightedを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Route 53 Weightedは、重み付けに基づいて複数エンドポイントへDNSトラフィックを分配するための選択肢です。",
            "Signed URLは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Origin Shieldは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53 Geolocationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Route 53 Weighted",
            "Signed URL",
            "Origin Shield",
            "Route 53 Geolocation"
        ]
    },
    {
        "id": "q321",
        "category": "CloudFront / Route 53",
        "difficulty": "標準",
        "question": "企業のAWS環境で「ユーザーからレイテンシが最も低いリージョンへDNSルーティングする」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Route 53 Latency",
            "Origin Shield",
            "Route 53 Weighted",
            "Route 53 Geolocation"
        ],
        "answer": 0,
        "explanation": "要件の中心は「ユーザーからレイテンシが最も低いリージョンへDNSルーティングする」です。したがってRoute 53 Latencyを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Route 53 Latencyは、ユーザーからレイテンシが最も低いリージョンへDNSルーティングするための選択肢です。",
            "Origin Shieldは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53 Weightedは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53 Geolocationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Route 53 Latency",
            "Origin Shield",
            "Route 53 Weighted",
            "Route 53 Geolocation"
        ]
    },
    {
        "id": "q322",
        "category": "CloudFront / Route 53",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「ユーザーからレイテンシが最も低いリージョンへDNSルーティングする」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Route 53 Latency",
            "Origin Shield",
            "Route 53 Geolocation",
            "Signed URL"
        ],
        "answer": 0,
        "explanation": "要件の中心は「ユーザーからレイテンシが最も低いリージョンへDNSルーティングする」です。したがってRoute 53 Latencyを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Route 53 Latencyは、ユーザーからレイテンシが最も低いリージョンへDNSルーティングするための選択肢です。",
            "Origin Shieldは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53 Geolocationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Signed URLは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Route 53 Latency",
            "Origin Shield",
            "Route 53 Geolocation",
            "Signed URL"
        ]
    },
    {
        "id": "q323",
        "category": "CloudFront / Route 53",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「ユーザーからレイテンシが最も低いリージョンへDNSルーティングする」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Signed URL",
            "CloudFront Functions",
            "Route 53 Latency",
            "Origin Shield"
        ],
        "answer": 2,
        "explanation": "要件の中心は「ユーザーからレイテンシが最も低いリージョンへDNSルーティングする」です。したがってRoute 53 Latencyを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Signed URLは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "CloudFront Functionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Route 53 Latencyは、ユーザーからレイテンシが最も低いリージョンへDNSルーティングするための選択肢です。",
            "Origin Shieldは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Route 53 Latency",
            "Signed URL",
            "CloudFront Functions",
            "Origin Shield"
        ]
    },
    {
        "id": "q324",
        "category": "CloudFront / Route 53",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「ユーザーからレイテンシが最も低いリージョンへDNSルーティングする」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Signed URL",
            "WAF",
            "Route 53 Latency",
            "CloudFront Functions"
        ],
        "answer": 2,
        "explanation": "要件の中心は「ユーザーからレイテンシが最も低いリージョンへDNSルーティングする」です。したがってRoute 53 Latencyを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Signed URLは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "WAFは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Route 53 Latencyは、ユーザーからレイテンシが最も低いリージョンへDNSルーティングするための選択肢です。",
            "CloudFront Functionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Route 53 Latency",
            "Signed URL",
            "WAF",
            "CloudFront Functions"
        ]
    },
    {
        "id": "q325",
        "category": "CloudFront / Route 53",
        "difficulty": "やや難",
        "question": "設計レビューで「ユーザーからレイテンシが最も低いリージョンへDNSルーティングする」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "CloudFront",
            "CloudFront Functions",
            "WAF",
            "Route 53 Latency"
        ],
        "answer": 3,
        "explanation": "要件の中心は「ユーザーからレイテンシが最も低いリージョンへDNSルーティングする」です。したがってRoute 53 Latencyを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "CloudFrontは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "CloudFront Functionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "WAFは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Route 53 Latencyは、ユーザーからレイテンシが最も低いリージョンへDNSルーティングするための選択肢です。"
        ],
        "services": [
            "Route 53 Latency",
            "CloudFront",
            "CloudFront Functions",
            "WAF"
        ]
    },
    {
        "id": "q326",
        "category": "CloudFront / Route 53",
        "difficulty": "標準",
        "question": "企業のAWS環境で「ユーザーの地域に基づいて異なるエンドポイントへDNSルーティングする」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Route 53 Geolocation",
            "CloudFront Functions",
            "Signed URL",
            "WAF"
        ],
        "answer": 0,
        "explanation": "要件の中心は「ユーザーの地域に基づいて異なるエンドポイントへDNSルーティングする」です。したがってRoute 53 Geolocationを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Route 53 Geolocationは、ユーザーの地域に基づいて異なるエンドポイントへDNSルーティングするための選択肢です。",
            "CloudFront Functionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Signed URLは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "WAFは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Route 53 Geolocation",
            "CloudFront Functions",
            "Signed URL",
            "WAF"
        ]
    },
    {
        "id": "q327",
        "category": "CloudFront / Route 53",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「ユーザーの地域に基づいて異なるエンドポイントへDNSルーティングする」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "CloudFront Functions",
            "WAF",
            "Route 53 Geolocation",
            "CloudFront"
        ],
        "answer": 2,
        "explanation": "要件の中心は「ユーザーの地域に基づいて異なるエンドポイントへDNSルーティングする」です。したがってRoute 53 Geolocationを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "CloudFront Functionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "WAFは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Route 53 Geolocationは、ユーザーの地域に基づいて異なるエンドポイントへDNSルーティングするための選択肢です。",
            "CloudFrontは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Route 53 Geolocation",
            "CloudFront Functions",
            "WAF",
            "CloudFront"
        ]
    },
    {
        "id": "q328",
        "category": "CloudFront / Route 53",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「ユーザーの地域に基づいて異なるエンドポイントへDNSルーティングする」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "CloudFront",
            "Route 53 Geolocation",
            "Route 53",
            "WAF"
        ],
        "answer": 1,
        "explanation": "要件の中心は「ユーザーの地域に基づいて異なるエンドポイントへDNSルーティングする」です。したがってRoute 53 Geolocationを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "CloudFrontは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Route 53 Geolocationは、ユーザーの地域に基づいて異なるエンドポイントへDNSルーティングするための選択肢です。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "WAFは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Route 53 Geolocation",
            "CloudFront",
            "Route 53",
            "WAF"
        ]
    },
    {
        "id": "q329",
        "category": "CloudFront / Route 53",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「ユーザーの地域に基づいて異なるエンドポイントへDNSルーティングする」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Route 53 Geolocation",
            "Route 53 Failover",
            "Route 53",
            "CloudFront"
        ],
        "answer": 0,
        "explanation": "要件の中心は「ユーザーの地域に基づいて異なるエンドポイントへDNSルーティングする」です。したがってRoute 53 Geolocationを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Route 53 Geolocationは、ユーザーの地域に基づいて異なるエンドポイントへDNSルーティングするための選択肢です。",
            "Route 53 Failoverは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "CloudFrontは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Route 53 Geolocation",
            "Route 53 Failover",
            "Route 53",
            "CloudFront"
        ]
    },
    {
        "id": "q330",
        "category": "CloudFront / Route 53",
        "difficulty": "やや難",
        "question": "設計レビューで「ユーザーの地域に基づいて異なるエンドポイントへDNSルーティングする」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Route 53 Geolocation",
            "Route 53 Weighted",
            "Route 53 Failover",
            "Route 53"
        ],
        "answer": 0,
        "explanation": "要件の中心は「ユーザーの地域に基づいて異なるエンドポイントへDNSルーティングする」です。したがってRoute 53 Geolocationを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Route 53 Geolocationは、ユーザーの地域に基づいて異なるエンドポイントへDNSルーティングするための選択肢です。",
            "Route 53 Weightedは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53 Failoverは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Route 53 Geolocation",
            "Route 53 Weighted",
            "Route 53 Failover",
            "Route 53"
        ]
    },
    {
        "id": "q331",
        "category": "CloudFront / Route 53",
        "difficulty": "標準",
        "question": "企業のAWS環境で「CloudFrontオリジンへのリクエスト集中を抑えキャッシュヒット率を高める」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Origin Shield",
            "CloudFront",
            "Route 53 Failover",
            "Route 53"
        ],
        "answer": 0,
        "explanation": "要件の中心は「CloudFrontオリジンへのリクエスト集中を抑えキャッシュヒット率を高める」です。したがってOrigin Shieldを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Origin Shieldは、CloudFrontオリジンへのリクエスト集中を抑えキャッシュヒット率を高めるための選択肢です。",
            "CloudFrontは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53 Failoverは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Origin Shield",
            "CloudFront",
            "Route 53 Failover",
            "Route 53"
        ]
    },
    {
        "id": "q332",
        "category": "CloudFront / Route 53",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「CloudFrontオリジンへのリクエスト集中を抑えキャッシュヒット率を高める」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Route 53 Weighted",
            "Route 53",
            "Route 53 Failover",
            "Origin Shield"
        ],
        "answer": 3,
        "explanation": "要件の中心は「CloudFrontオリジンへのリクエスト集中を抑えキャッシュヒット率を高める」です。したがってOrigin Shieldを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Route 53 Weightedは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53 Failoverは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Origin Shieldは、CloudFrontオリジンへのリクエスト集中を抑えキャッシュヒット率を高めるための選択肢です。"
        ],
        "services": [
            "Origin Shield",
            "Route 53 Weighted",
            "Route 53",
            "Route 53 Failover"
        ]
    },
    {
        "id": "q333",
        "category": "CloudFront / Route 53",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「CloudFrontオリジンへのリクエスト集中を抑えキャッシュヒット率を高める」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Route 53 Latency",
            "Route 53 Weighted",
            "Origin Shield",
            "Route 53 Failover"
        ],
        "answer": 2,
        "explanation": "要件の中心は「CloudFrontオリジンへのリクエスト集中を抑えキャッシュヒット率を高める」です。したがってOrigin Shieldを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Route 53 Latencyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53 Weightedは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Origin Shieldは、CloudFrontオリジンへのリクエスト集中を抑えキャッシュヒット率を高めるための選択肢です。",
            "Route 53 Failoverは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Origin Shield",
            "Route 53 Latency",
            "Route 53 Weighted",
            "Route 53 Failover"
        ]
    },
    {
        "id": "q334",
        "category": "CloudFront / Route 53",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「CloudFrontオリジンへのリクエスト集中を抑えキャッシュヒット率を高める」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Route 53 Geolocation",
            "Route 53 Weighted",
            "Origin Shield",
            "Route 53 Latency"
        ],
        "answer": 2,
        "explanation": "要件の中心は「CloudFrontオリジンへのリクエスト集中を抑えキャッシュヒット率を高める」です。したがってOrigin Shieldを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Route 53 Geolocationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53 Weightedは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Origin Shieldは、CloudFrontオリジンへのリクエスト集中を抑えキャッシュヒット率を高めるための選択肢です。",
            "Route 53 Latencyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Origin Shield",
            "Route 53 Geolocation",
            "Route 53 Weighted",
            "Route 53 Latency"
        ]
    },
    {
        "id": "q335",
        "category": "CloudFront / Route 53",
        "difficulty": "やや難",
        "question": "設計レビューで「CloudFrontオリジンへのリクエスト集中を抑えキャッシュヒット率を高める」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Route 53 Latency",
            "Origin Shield",
            "Signed URL",
            "Route 53 Geolocation"
        ],
        "answer": 1,
        "explanation": "要件の中心は「CloudFrontオリジンへのリクエスト集中を抑えキャッシュヒット率を高める」です。したがってOrigin Shieldを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Route 53 Latencyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Origin Shieldは、CloudFrontオリジンへのリクエスト集中を抑えキャッシュヒット率を高めるための選択肢です。",
            "Signed URLは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53 Geolocationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Origin Shield",
            "Route 53 Latency",
            "Signed URL",
            "Route 53 Geolocation"
        ]
    },
    {
        "id": "q336",
        "category": "CloudFront / Route 53",
        "difficulty": "標準",
        "question": "企業のAWS環境で「認証済みユーザーだけが限定コンテンツへアクセスできるようURLに署名する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Signed URL",
            "Route 53 Latency",
            "Route 53 Geolocation",
            "Route 53 Weighted"
        ],
        "answer": 0,
        "explanation": "要件の中心は「認証済みユーザーだけが限定コンテンツへアクセスできるようURLに署名する」です。したがってSigned URLを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Signed URLは、認証済みユーザーだけが限定コンテンツへアクセスできるようURLに署名するための選択肢です。",
            "Route 53 Latencyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53 Geolocationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53 Weightedは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Signed URL",
            "Route 53 Latency",
            "Route 53 Geolocation",
            "Route 53 Weighted"
        ]
    },
    {
        "id": "q337",
        "category": "CloudFront / Route 53",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「認証済みユーザーだけが限定コンテンツへアクセスできるようURLに署名する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Route 53 Geolocation",
            "Route 53 Latency",
            "Signed URL",
            "Origin Shield"
        ],
        "answer": 2,
        "explanation": "要件の中心は「認証済みユーザーだけが限定コンテンツへアクセスできるようURLに署名する」です。したがってSigned URLを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Route 53 Geolocationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53 Latencyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Signed URLは、認証済みユーザーだけが限定コンテンツへアクセスできるようURLに署名するための選択肢です。",
            "Origin Shieldは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Signed URL",
            "Route 53 Geolocation",
            "Route 53 Latency",
            "Origin Shield"
        ]
    },
    {
        "id": "q338",
        "category": "CloudFront / Route 53",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「認証済みユーザーだけが限定コンテンツへアクセスできるようURLに署名する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "CloudFront Functions",
            "Signed URL",
            "Route 53 Geolocation",
            "Origin Shield"
        ],
        "answer": 1,
        "explanation": "要件の中心は「認証済みユーザーだけが限定コンテンツへアクセスできるようURLに署名する」です。したがってSigned URLを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "CloudFront Functionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Signed URLは、認証済みユーザーだけが限定コンテンツへアクセスできるようURLに署名するための選択肢です。",
            "Route 53 Geolocationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Origin Shieldは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Signed URL",
            "CloudFront Functions",
            "Route 53 Geolocation",
            "Origin Shield"
        ]
    },
    {
        "id": "q339",
        "category": "CloudFront / Route 53",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「認証済みユーザーだけが限定コンテンツへアクセスできるようURLに署名する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "WAF",
            "CloudFront Functions",
            "Origin Shield",
            "Signed URL"
        ],
        "answer": 3,
        "explanation": "要件の中心は「認証済みユーザーだけが限定コンテンツへアクセスできるようURLに署名する」です。したがってSigned URLを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "WAFは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "CloudFront Functionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Origin Shieldは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Signed URLは、認証済みユーザーだけが限定コンテンツへアクセスできるようURLに署名するための選択肢です。"
        ],
        "services": [
            "Signed URL",
            "WAF",
            "CloudFront Functions",
            "Origin Shield"
        ]
    },
    {
        "id": "q340",
        "category": "CloudFront / Route 53",
        "difficulty": "やや難",
        "question": "設計レビューで「認証済みユーザーだけが限定コンテンツへアクセスできるようURLに署名する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "CloudFront",
            "CloudFront Functions",
            "Signed URL",
            "WAF"
        ],
        "answer": 2,
        "explanation": "要件の中心は「認証済みユーザーだけが限定コンテンツへアクセスできるようURLに署名する」です。したがってSigned URLを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "CloudFrontは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "CloudFront Functionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Signed URLは、認証済みユーザーだけが限定コンテンツへアクセスできるようURLに署名するための選択肢です。",
            "WAFは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Signed URL",
            "CloudFront",
            "CloudFront Functions",
            "WAF"
        ]
    },
    {
        "id": "q341",
        "category": "CloudFront / Route 53",
        "difficulty": "標準",
        "question": "企業のAWS環境で「CloudFrontエッジで軽量なJavaScript処理を実行する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Origin Shield",
            "CloudFront Functions",
            "Signed URL",
            "WAF"
        ],
        "answer": 1,
        "explanation": "要件の中心は「CloudFrontエッジで軽量なJavaScript処理を実行する」です。したがってCloudFront Functionsを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Origin Shieldは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。CloudFront Functionsは、CloudFrontエッジで軽量なJavaScript処理を実行するための選択肢です。",
            "Signed URLは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "WAFは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "CloudFront Functions",
            "Origin Shield",
            "Signed URL",
            "WAF"
        ]
    },
    {
        "id": "q342",
        "category": "CloudFront / Route 53",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「CloudFrontエッジで軽量なJavaScript処理を実行する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "CloudFront Functions",
            "CloudFront",
            "WAF",
            "Signed URL"
        ],
        "answer": 0,
        "explanation": "要件の中心は「CloudFrontエッジで軽量なJavaScript処理を実行する」です。したがってCloudFront Functionsを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。CloudFront Functionsは、CloudFrontエッジで軽量なJavaScript処理を実行するための選択肢です。",
            "CloudFrontは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "WAFは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Signed URLは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "CloudFront Functions",
            "CloudFront",
            "WAF",
            "Signed URL"
        ]
    },
    {
        "id": "q343",
        "category": "CloudFront / Route 53",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「CloudFrontエッジで軽量なJavaScript処理を実行する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "CloudFront Functions",
            "WAF",
            "Route 53",
            "CloudFront"
        ],
        "answer": 0,
        "explanation": "要件の中心は「CloudFrontエッジで軽量なJavaScript処理を実行する」です。したがってCloudFront Functionsを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。CloudFront Functionsは、CloudFrontエッジで軽量なJavaScript処理を実行するための選択肢です。",
            "WAFは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "CloudFrontは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "CloudFront Functions",
            "WAF",
            "Route 53",
            "CloudFront"
        ]
    },
    {
        "id": "q344",
        "category": "CloudFront / Route 53",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「CloudFrontエッジで軽量なJavaScript処理を実行する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "CloudFront",
            "CloudFront Functions",
            "Route 53",
            "Route 53 Failover"
        ],
        "answer": 1,
        "explanation": "要件の中心は「CloudFrontエッジで軽量なJavaScript処理を実行する」です。したがってCloudFront Functionsを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "CloudFrontは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。CloudFront Functionsは、CloudFrontエッジで軽量なJavaScript処理を実行するための選択肢です。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53 Failoverは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "CloudFront Functions",
            "CloudFront",
            "Route 53",
            "Route 53 Failover"
        ]
    },
    {
        "id": "q345",
        "category": "CloudFront / Route 53",
        "difficulty": "やや難",
        "question": "設計レビューで「CloudFrontエッジで軽量なJavaScript処理を実行する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "CloudFront Functions",
            "Route 53 Failover",
            "Route 53",
            "Route 53 Weighted"
        ],
        "answer": 0,
        "explanation": "要件の中心は「CloudFrontエッジで軽量なJavaScript処理を実行する」です。したがってCloudFront Functionsを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。CloudFront Functionsは、CloudFrontエッジで軽量なJavaScript処理を実行するための選択肢です。",
            "Route 53 Failoverは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53 Weightedは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "CloudFront Functions",
            "Route 53 Failover",
            "Route 53",
            "Route 53 Weighted"
        ]
    },
    {
        "id": "q346",
        "category": "CloudFront / Route 53",
        "difficulty": "標準",
        "question": "企業のAWS環境で「CloudFrontに到達するHTTP/HTTPSリクエストをWAFルールで検査して遮断する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "WAF",
            "Route 53 Failover",
            "CloudFront",
            "Route 53"
        ],
        "answer": 0,
        "explanation": "要件の中心は「CloudFrontに到達するHTTP/HTTPSリクエストをWAFルールで検査して遮断する」です。したがってWAFを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。WAFは、CloudFrontに到達するHTTP/HTTPSリクエストをWAFルールで検査して遮断するための選択肢です。",
            "Route 53 Failoverは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "CloudFrontは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "WAF",
            "Route 53 Failover",
            "CloudFront",
            "Route 53"
        ]
    },
    {
        "id": "q347",
        "category": "CloudFront / Route 53",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「CloudFrontに到達するHTTP/HTTPSリクエストをWAFルールで検査して遮断する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Route 53",
            "Route 53 Weighted",
            "Route 53 Failover",
            "WAF"
        ],
        "answer": 3,
        "explanation": "要件の中心は「CloudFrontに到達するHTTP/HTTPSリクエストをWAFルールで検査して遮断する」です。したがってWAFを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Route 53は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53 Weightedは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53 Failoverは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。WAFは、CloudFrontに到達するHTTP/HTTPSリクエストをWAFルールで検査して遮断するための選択肢です。"
        ],
        "services": [
            "WAF",
            "Route 53",
            "Route 53 Weighted",
            "Route 53 Failover"
        ]
    },
    {
        "id": "q348",
        "category": "CloudFront / Route 53",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「CloudFrontに到達するHTTP/HTTPSリクエストをWAFルールで検査して遮断する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Route 53 Failover",
            "Route 53 Weighted",
            "Route 53 Latency",
            "WAF"
        ],
        "answer": 3,
        "explanation": "要件の中心は「CloudFrontに到達するHTTP/HTTPSリクエストをWAFルールで検査して遮断する」です。したがってWAFを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Route 53 Failoverは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53 Weightedは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53 Latencyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。WAFは、CloudFrontに到達するHTTP/HTTPSリクエストをWAFルールで検査して遮断するための選択肢です。"
        ],
        "services": [
            "WAF",
            "Route 53 Failover",
            "Route 53 Weighted",
            "Route 53 Latency"
        ]
    },
    {
        "id": "q349",
        "category": "CloudFront / Route 53",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「CloudFrontに到達するHTTP/HTTPSリクエストをWAFルールで検査して遮断する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Route 53 Weighted",
            "WAF",
            "Route 53 Latency",
            "Route 53 Geolocation"
        ],
        "answer": 1,
        "explanation": "要件の中心は「CloudFrontに到達するHTTP/HTTPSリクエストをWAFルールで検査して遮断する」です。したがってWAFを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Route 53 Weightedは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。WAFは、CloudFrontに到達するHTTP/HTTPSリクエストをWAFルールで検査して遮断するための選択肢です。",
            "Route 53 Latencyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53 Geolocationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "WAF",
            "Route 53 Weighted",
            "Route 53 Latency",
            "Route 53 Geolocation"
        ]
    },
    {
        "id": "q350",
        "category": "CloudFront / Route 53",
        "difficulty": "やや難",
        "question": "設計レビューで「CloudFrontに到達するHTTP/HTTPSリクエストをWAFルールで検査して遮断する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Route 53 Latency",
            "Route 53 Geolocation",
            "Origin Shield",
            "WAF"
        ],
        "answer": 3,
        "explanation": "要件の中心は「CloudFrontに到達するHTTP/HTTPSリクエストをWAFルールで検査して遮断する」です。したがってWAFを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Route 53 Latencyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Route 53 Geolocationは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Origin Shieldは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。WAFは、CloudFrontに到達するHTTP/HTTPSリクエストをWAFルールで検査して遮断するための選択肢です。"
        ],
        "services": [
            "WAF",
            "Route 53 Latency",
            "Route 53 Geolocation",
            "Origin Shield"
        ]
    },
    {
        "id": "q351",
        "category": "Serverless",
        "difficulty": "標準",
        "question": "企業のAWS環境で「サーバーを管理せずイベント駆動でコードを実行する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "SNS",
            "SQS",
            "Lambda",
            "API Gateway"
        ],
        "answer": 2,
        "explanation": "要件の中心は「サーバーを管理せずイベント駆動でコードを実行する」です。したがってLambdaを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "SNSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "SQSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Lambdaは、サーバーを管理せずイベント駆動でコードを実行するための選択肢です。",
            "API Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Lambda",
            "SNS",
            "SQS",
            "API Gateway"
        ]
    },
    {
        "id": "q352",
        "category": "Serverless",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「サーバーを管理せずイベント駆動でコードを実行する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "EventBridge",
            "SNS",
            "Lambda",
            "SQS"
        ],
        "answer": 2,
        "explanation": "要件の中心は「サーバーを管理せずイベント駆動でコードを実行する」です。したがってLambdaを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "EventBridgeは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "SNSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Lambdaは、サーバーを管理せずイベント駆動でコードを実行するための選択肢です。",
            "SQSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Lambda",
            "EventBridge",
            "SNS",
            "SQS"
        ]
    },
    {
        "id": "q353",
        "category": "Serverless",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「サーバーを管理せずイベント駆動でコードを実行する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "EventBridge",
            "Step Functions",
            "Lambda",
            "SNS"
        ],
        "answer": 2,
        "explanation": "要件の中心は「サーバーを管理せずイベント駆動でコードを実行する」です。したがってLambdaを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "EventBridgeは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Step Functionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Lambdaは、サーバーを管理せずイベント駆動でコードを実行するための選択肢です。",
            "SNSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Lambda",
            "EventBridge",
            "Step Functions",
            "SNS"
        ]
    },
    {
        "id": "q354",
        "category": "Serverless",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「サーバーを管理せずイベント駆動でコードを実行する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Fargate",
            "Lambda",
            "EventBridge",
            "Step Functions"
        ],
        "answer": 1,
        "explanation": "要件の中心は「サーバーを管理せずイベント駆動でコードを実行する」です。したがってLambdaを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Fargateは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Lambdaは、サーバーを管理せずイベント駆動でコードを実行するための選択肢です。",
            "EventBridgeは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Step Functionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Lambda",
            "Fargate",
            "EventBridge",
            "Step Functions"
        ]
    },
    {
        "id": "q355",
        "category": "Serverless",
        "difficulty": "やや難",
        "question": "設計レビューで「サーバーを管理せずイベント駆動でコードを実行する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Step Functions",
            "Cognito",
            "Lambda",
            "Fargate"
        ],
        "answer": 2,
        "explanation": "要件の中心は「サーバーを管理せずイベント駆動でコードを実行する」です。したがってLambdaを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Step Functionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Cognitoは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Lambdaは、サーバーを管理せずイベント駆動でコードを実行するための選択肢です。",
            "Fargateは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Lambda",
            "Step Functions",
            "Cognito",
            "Fargate"
        ]
    },
    {
        "id": "q356",
        "category": "Serverless",
        "difficulty": "標準",
        "question": "企業のAWS環境で「HTTP APIやREST APIなどのAPIエンドポイントを作成・公開・管理する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "API Gateway",
            "Step Functions",
            "EventBridge",
            "Fargate"
        ],
        "answer": 0,
        "explanation": "要件の中心は「HTTP APIやREST APIなどのAPIエンドポイントを作成・公開・管理する」です。したがってAPI Gatewayを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。API Gatewayは、HTTP APIやREST APIなどのAPIエンドポイントを作成・公開・管理するための選択肢です。",
            "Step Functionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "EventBridgeは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Fargateは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "API Gateway",
            "Step Functions",
            "EventBridge",
            "Fargate"
        ]
    },
    {
        "id": "q357",
        "category": "Serverless",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「HTTP APIやREST APIなどのAPIエンドポイントを作成・公開・管理する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "API Gateway",
            "Fargate",
            "Cognito",
            "Step Functions"
        ],
        "answer": 0,
        "explanation": "要件の中心は「HTTP APIやREST APIなどのAPIエンドポイントを作成・公開・管理する」です。したがってAPI Gatewayを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。API Gatewayは、HTTP APIやREST APIなどのAPIエンドポイントを作成・公開・管理するための選択肢です。",
            "Fargateは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Cognitoは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Step Functionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "API Gateway",
            "Fargate",
            "Cognito",
            "Step Functions"
        ]
    },
    {
        "id": "q358",
        "category": "Serverless",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「HTTP APIやREST APIなどのAPIエンドポイントを作成・公開・管理する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "API Gateway",
            "Fargate",
            "Cognito",
            "AppSync"
        ],
        "answer": 0,
        "explanation": "要件の中心は「HTTP APIやREST APIなどのAPIエンドポイントを作成・公開・管理する」です。したがってAPI Gatewayを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。API Gatewayは、HTTP APIやREST APIなどのAPIエンドポイントを作成・公開・管理するための選択肢です。",
            "Fargateは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Cognitoは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "AppSyncは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "API Gateway",
            "Fargate",
            "Cognito",
            "AppSync"
        ]
    },
    {
        "id": "q359",
        "category": "Serverless",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「HTTP APIやREST APIなどのAPIエンドポイントを作成・公開・管理する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "API Gateway",
            "S3",
            "Cognito",
            "AppSync"
        ],
        "answer": 0,
        "explanation": "要件の中心は「HTTP APIやREST APIなどのAPIエンドポイントを作成・公開・管理する」です。したがってAPI Gatewayを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。API Gatewayは、HTTP APIやREST APIなどのAPIエンドポイントを作成・公開・管理するための選択肢です。",
            "S3は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Cognitoは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "AppSyncは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "API Gateway",
            "S3",
            "Cognito",
            "AppSync"
        ]
    },
    {
        "id": "q360",
        "category": "Serverless",
        "difficulty": "やや難",
        "question": "設計レビューで「HTTP APIやREST APIなどのAPIエンドポイントを作成・公開・管理する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "API Gateway",
            "AppSync",
            "Lambda",
            "S3"
        ],
        "answer": 0,
        "explanation": "要件の中心は「HTTP APIやREST APIなどのAPIエンドポイントを作成・公開・管理する」です。したがってAPI Gatewayを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。API Gatewayは、HTTP APIやREST APIなどのAPIエンドポイントを作成・公開・管理するための選択肢です。",
            "AppSyncは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Lambdaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "API Gateway",
            "AppSync",
            "Lambda",
            "S3"
        ]
    },
    {
        "id": "q361",
        "category": "Serverless",
        "difficulty": "標準",
        "question": "企業のAWS環境で「コンポーネント間を非同期に疎結合化するメッセージキューを提供する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "SQS",
            "AppSync",
            "Cognito",
            "S3"
        ],
        "answer": 0,
        "explanation": "要件の中心は「コンポーネント間を非同期に疎結合化するメッセージキューを提供する」です。したがってSQSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。SQSは、コンポーネント間を非同期に疎結合化するメッセージキューを提供するための選択肢です。",
            "AppSyncは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Cognitoは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "SQS",
            "AppSync",
            "Cognito",
            "S3"
        ]
    },
    {
        "id": "q362",
        "category": "Serverless",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「コンポーネント間を非同期に疎結合化するメッセージキューを提供する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "SQS",
            "Lambda",
            "S3",
            "AppSync"
        ],
        "answer": 0,
        "explanation": "要件の中心は「コンポーネント間を非同期に疎結合化するメッセージキューを提供する」です。したがってSQSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。SQSは、コンポーネント間を非同期に疎結合化するメッセージキューを提供するための選択肢です。",
            "Lambdaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "AppSyncは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "SQS",
            "Lambda",
            "S3",
            "AppSync"
        ]
    },
    {
        "id": "q363",
        "category": "Serverless",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「コンポーネント間を非同期に疎結合化するメッセージキューを提供する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "API Gateway",
            "Lambda",
            "SQS",
            "S3"
        ],
        "answer": 2,
        "explanation": "要件の中心は「コンポーネント間を非同期に疎結合化するメッセージキューを提供する」です。したがってSQSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "API Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Lambdaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。SQSは、コンポーネント間を非同期に疎結合化するメッセージキューを提供するための選択肢です。",
            "S3は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "SQS",
            "API Gateway",
            "Lambda",
            "S3"
        ]
    },
    {
        "id": "q364",
        "category": "Serverless",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「コンポーネント間を非同期に疎結合化するメッセージキューを提供する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "SNS",
            "SQS",
            "API Gateway",
            "Lambda"
        ],
        "answer": 1,
        "explanation": "要件の中心は「コンポーネント間を非同期に疎結合化するメッセージキューを提供する」です。したがってSQSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "SNSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。SQSは、コンポーネント間を非同期に疎結合化するメッセージキューを提供するための選択肢です。",
            "API Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Lambdaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "SQS",
            "SNS",
            "API Gateway",
            "Lambda"
        ]
    },
    {
        "id": "q365",
        "category": "Serverless",
        "difficulty": "やや難",
        "question": "設計レビューで「コンポーネント間を非同期に疎結合化するメッセージキューを提供する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "SNS",
            "SQS",
            "API Gateway",
            "EventBridge"
        ],
        "answer": 1,
        "explanation": "要件の中心は「コンポーネント間を非同期に疎結合化するメッセージキューを提供する」です。したがってSQSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "SNSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。SQSは、コンポーネント間を非同期に疎結合化するメッセージキューを提供するための選択肢です。",
            "API Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "EventBridgeは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "SQS",
            "SNS",
            "API Gateway",
            "EventBridge"
        ]
    },
    {
        "id": "q366",
        "category": "Serverless",
        "difficulty": "標準",
        "question": "企業のAWS環境で「1つのメッセージを複数の購読先へ配信するPub/Sub通知を提供する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "API Gateway",
            "SQS",
            "SNS",
            "Lambda"
        ],
        "answer": 2,
        "explanation": "要件の中心は「1つのメッセージを複数の購読先へ配信するPub/Sub通知を提供する」です。したがってSNSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "API Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "SQSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。SNSは、1つのメッセージを複数の購読先へ配信するPub/Sub通知を提供するための選択肢です。",
            "Lambdaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "SNS",
            "API Gateway",
            "SQS",
            "Lambda"
        ]
    },
    {
        "id": "q367",
        "category": "Serverless",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「1つのメッセージを複数の購読先へ配信するPub/Sub通知を提供する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "EventBridge",
            "SQS",
            "API Gateway",
            "SNS"
        ],
        "answer": 3,
        "explanation": "要件の中心は「1つのメッセージを複数の購読先へ配信するPub/Sub通知を提供する」です。したがってSNSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "EventBridgeは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "SQSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "API Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。SNSは、1つのメッセージを複数の購読先へ配信するPub/Sub通知を提供するための選択肢です。"
        ],
        "services": [
            "SNS",
            "EventBridge",
            "SQS",
            "API Gateway"
        ]
    },
    {
        "id": "q368",
        "category": "Serverless",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「1つのメッセージを複数の購読先へ配信するPub/Sub通知を提供する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "SNS",
            "SQS",
            "EventBridge",
            "Step Functions"
        ],
        "answer": 0,
        "explanation": "要件の中心は「1つのメッセージを複数の購読先へ配信するPub/Sub通知を提供する」です。したがってSNSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。SNSは、1つのメッセージを複数の購読先へ配信するPub/Sub通知を提供するための選択肢です。",
            "SQSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "EventBridgeは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Step Functionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "SNS",
            "SQS",
            "EventBridge",
            "Step Functions"
        ]
    },
    {
        "id": "q369",
        "category": "Serverless",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「1つのメッセージを複数の購読先へ配信するPub/Sub通知を提供する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Fargate",
            "Step Functions",
            "SNS",
            "EventBridge"
        ],
        "answer": 2,
        "explanation": "要件の中心は「1つのメッセージを複数の購読先へ配信するPub/Sub通知を提供する」です。したがってSNSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Fargateは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Step Functionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。SNSは、1つのメッセージを複数の購読先へ配信するPub/Sub通知を提供するための選択肢です。",
            "EventBridgeは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "SNS",
            "Fargate",
            "Step Functions",
            "EventBridge"
        ]
    },
    {
        "id": "q370",
        "category": "Serverless",
        "difficulty": "やや難",
        "question": "設計レビューで「1つのメッセージを複数の購読先へ配信するPub/Sub通知を提供する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Step Functions",
            "Fargate",
            "SNS",
            "Cognito"
        ],
        "answer": 2,
        "explanation": "要件の中心は「1つのメッセージを複数の購読先へ配信するPub/Sub通知を提供する」です。したがってSNSを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Step Functionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Fargateは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。SNSは、1つのメッセージを複数の購読先へ配信するPub/Sub通知を提供するための選択肢です。",
            "Cognitoは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "SNS",
            "Step Functions",
            "Fargate",
            "Cognito"
        ]
    },
    {
        "id": "q371",
        "category": "Serverless",
        "difficulty": "標準",
        "question": "企業のAWS環境で「AWSサービスやアプリケーションのイベントをルールに基づいて各ターゲットへルーティングする」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "EventBridge",
            "Fargate",
            "Step Functions",
            "SNS"
        ],
        "answer": 0,
        "explanation": "要件の中心は「AWSサービスやアプリケーションのイベントをルールに基づいて各ターゲットへルーティングする」です。したがってEventBridgeを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。EventBridgeは、AWSサービスやアプリケーションのイベントをルールに基づいて各ターゲットへルーティングするための選択肢です。",
            "Fargateは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Step Functionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "SNSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "EventBridge",
            "Fargate",
            "Step Functions",
            "SNS"
        ]
    },
    {
        "id": "q372",
        "category": "Serverless",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「AWSサービスやアプリケーションのイベントをルールに基づいて各ターゲットへルーティングする」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "EventBridge",
            "Step Functions",
            "Fargate",
            "Cognito"
        ],
        "answer": 0,
        "explanation": "要件の中心は「AWSサービスやアプリケーションのイベントをルールに基づいて各ターゲットへルーティングする」です。したがってEventBridgeを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。EventBridgeは、AWSサービスやアプリケーションのイベントをルールに基づいて各ターゲットへルーティングするための選択肢です。",
            "Step Functionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Fargateは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Cognitoは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "EventBridge",
            "Step Functions",
            "Fargate",
            "Cognito"
        ]
    },
    {
        "id": "q373",
        "category": "Serverless",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「AWSサービスやアプリケーションのイベントをルールに基づいて各ターゲットへルーティングする」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "EventBridge",
            "Fargate",
            "Cognito",
            "AppSync"
        ],
        "answer": 0,
        "explanation": "要件の中心は「AWSサービスやアプリケーションのイベントをルールに基づいて各ターゲットへルーティングする」です。したがってEventBridgeを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。EventBridgeは、AWSサービスやアプリケーションのイベントをルールに基づいて各ターゲットへルーティングするための選択肢です。",
            "Fargateは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Cognitoは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "AppSyncは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "EventBridge",
            "Fargate",
            "Cognito",
            "AppSync"
        ]
    },
    {
        "id": "q374",
        "category": "Serverless",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「AWSサービスやアプリケーションのイベントをルールに基づいて各ターゲットへルーティングする」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "AppSync",
            "Cognito",
            "EventBridge",
            "S3"
        ],
        "answer": 2,
        "explanation": "要件の中心は「AWSサービスやアプリケーションのイベントをルールに基づいて各ターゲットへルーティングする」です。したがってEventBridgeを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "AppSyncは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Cognitoは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。EventBridgeは、AWSサービスやアプリケーションのイベントをルールに基づいて各ターゲットへルーティングするための選択肢です。",
            "S3は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "EventBridge",
            "AppSync",
            "Cognito",
            "S3"
        ]
    },
    {
        "id": "q375",
        "category": "Serverless",
        "difficulty": "やや難",
        "question": "設計レビューで「AWSサービスやアプリケーションのイベントをルールに基づいて各ターゲットへルーティングする」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Lambda",
            "EventBridge",
            "AppSync",
            "S3"
        ],
        "answer": 1,
        "explanation": "要件の中心は「AWSサービスやアプリケーションのイベントをルールに基づいて各ターゲットへルーティングする」です。したがってEventBridgeを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Lambdaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。EventBridgeは、AWSサービスやアプリケーションのイベントをルールに基づいて各ターゲットへルーティングするための選択肢です。",
            "AppSyncは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "EventBridge",
            "Lambda",
            "AppSync",
            "S3"
        ]
    },
    {
        "id": "q376",
        "category": "Serverless",
        "difficulty": "標準",
        "question": "企業のAWS環境で「複数の処理を状態機械として順序・分岐・リトライ付きでオーケストレーションする」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "S3",
            "Cognito",
            "Step Functions",
            "AppSync"
        ],
        "answer": 2,
        "explanation": "要件の中心は「複数の処理を状態機械として順序・分岐・リトライ付きでオーケストレーションする」です。したがってStep Functionsを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Cognitoは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Step Functionsは、複数の処理を状態機械として順序・分岐・リトライ付きでオーケストレーションするための選択肢です。",
            "AppSyncは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Step Functions",
            "S3",
            "Cognito",
            "AppSync"
        ]
    },
    {
        "id": "q377",
        "category": "Serverless",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「複数の処理を状態機械として順序・分岐・リトライ付きでオーケストレーションする」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "AppSync",
            "Step Functions",
            "S3",
            "Lambda"
        ],
        "answer": 1,
        "explanation": "要件の中心は「複数の処理を状態機械として順序・分岐・リトライ付きでオーケストレーションする」です。したがってStep Functionsを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "AppSyncは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Step Functionsは、複数の処理を状態機械として順序・分岐・リトライ付きでオーケストレーションするための選択肢です。",
            "S3は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Lambdaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Step Functions",
            "AppSync",
            "S3",
            "Lambda"
        ]
    },
    {
        "id": "q378",
        "category": "Serverless",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「複数の処理を状態機械として順序・分岐・リトライ付きでオーケストレーションする」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "S3",
            "API Gateway",
            "Lambda",
            "Step Functions"
        ],
        "answer": 3,
        "explanation": "要件の中心は「複数の処理を状態機械として順序・分岐・リトライ付きでオーケストレーションする」です。したがってStep Functionsを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "API Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Lambdaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Step Functionsは、複数の処理を状態機械として順序・分岐・リトライ付きでオーケストレーションするための選択肢です。"
        ],
        "services": [
            "Step Functions",
            "S3",
            "API Gateway",
            "Lambda"
        ]
    },
    {
        "id": "q379",
        "category": "Serverless",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「複数の処理を状態機械として順序・分岐・リトライ付きでオーケストレーションする」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Step Functions",
            "SQS",
            "API Gateway",
            "Lambda"
        ],
        "answer": 0,
        "explanation": "要件の中心は「複数の処理を状態機械として順序・分岐・リトライ付きでオーケストレーションする」です。したがってStep Functionsを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Step Functionsは、複数の処理を状態機械として順序・分岐・リトライ付きでオーケストレーションするための選択肢です。",
            "SQSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "API Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Lambdaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Step Functions",
            "SQS",
            "API Gateway",
            "Lambda"
        ]
    },
    {
        "id": "q380",
        "category": "Serverless",
        "difficulty": "やや難",
        "question": "設計レビューで「複数の処理を状態機械として順序・分岐・リトライ付きでオーケストレーションする」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "SQS",
            "Step Functions",
            "API Gateway",
            "SNS"
        ],
        "answer": 1,
        "explanation": "要件の中心は「複数の処理を状態機械として順序・分岐・リトライ付きでオーケストレーションする」です。したがってStep Functionsを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "SQSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Step Functionsは、複数の処理を状態機械として順序・分岐・リトライ付きでオーケストレーションするための選択肢です。",
            "API Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "SNSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Step Functions",
            "SQS",
            "API Gateway",
            "SNS"
        ]
    },
    {
        "id": "q381",
        "category": "Serverless",
        "difficulty": "標準",
        "question": "企業のAWS環境で「サーバーを管理せずECS/EKSコンテナを実行する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Lambda",
            "Fargate",
            "SQS",
            "API Gateway"
        ],
        "answer": 1,
        "explanation": "要件の中心は「サーバーを管理せずECS/EKSコンテナを実行する」です。したがってFargateを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Lambdaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Fargateは、サーバーを管理せずECS/EKSコンテナを実行するための選択肢です。",
            "SQSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "API Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Fargate",
            "Lambda",
            "SQS",
            "API Gateway"
        ]
    },
    {
        "id": "q382",
        "category": "Serverless",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「サーバーを管理せずECS/EKSコンテナを実行する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Fargate",
            "SQS",
            "API Gateway",
            "SNS"
        ],
        "answer": 0,
        "explanation": "要件の中心は「サーバーを管理せずECS/EKSコンテナを実行する」です。したがってFargateを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Fargateは、サーバーを管理せずECS/EKSコンテナを実行するための選択肢です。",
            "SQSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "API Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "SNSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Fargate",
            "SQS",
            "API Gateway",
            "SNS"
        ]
    },
    {
        "id": "q383",
        "category": "Serverless",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「サーバーを管理せずECS/EKSコンテナを実行する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "SQS",
            "EventBridge",
            "SNS",
            "Fargate"
        ],
        "answer": 3,
        "explanation": "要件の中心は「サーバーを管理せずECS/EKSコンテナを実行する」です。したがってFargateを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "SQSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "EventBridgeは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "SNSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Fargateは、サーバーを管理せずECS/EKSコンテナを実行するための選択肢です。"
        ],
        "services": [
            "Fargate",
            "SQS",
            "EventBridge",
            "SNS"
        ]
    },
    {
        "id": "q384",
        "category": "Serverless",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「サーバーを管理せずECS/EKSコンテナを実行する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Step Functions",
            "EventBridge",
            "SNS",
            "Fargate"
        ],
        "answer": 3,
        "explanation": "要件の中心は「サーバーを管理せずECS/EKSコンテナを実行する」です。したがってFargateを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Step Functionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "EventBridgeは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "SNSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Fargateは、サーバーを管理せずECS/EKSコンテナを実行するための選択肢です。"
        ],
        "services": [
            "Fargate",
            "Step Functions",
            "EventBridge",
            "SNS"
        ]
    },
    {
        "id": "q385",
        "category": "Serverless",
        "difficulty": "やや難",
        "question": "設計レビューで「サーバーを管理せずECS/EKSコンテナを実行する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Fargate",
            "EventBridge",
            "Cognito",
            "Step Functions"
        ],
        "answer": 0,
        "explanation": "要件の中心は「サーバーを管理せずECS/EKSコンテナを実行する」です。したがってFargateを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Fargateは、サーバーを管理せずECS/EKSコンテナを実行するための選択肢です。",
            "EventBridgeは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Cognitoは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Step Functionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Fargate",
            "EventBridge",
            "Cognito",
            "Step Functions"
        ]
    },
    {
        "id": "q386",
        "category": "Serverless",
        "difficulty": "標準",
        "question": "企業のAWS環境で「Webやモバイルアプリのユーザー認証・認可とID管理を提供する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "EventBridge",
            "Step Functions",
            "SNS",
            "Cognito"
        ],
        "answer": 3,
        "explanation": "要件の中心は「Webやモバイルアプリのユーザー認証・認可とID管理を提供する」です。したがってCognitoを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "EventBridgeは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Step Functionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "SNSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Cognitoは、Webやモバイルアプリのユーザー認証・認可とID管理を提供するための選択肢です。"
        ],
        "services": [
            "Cognito",
            "EventBridge",
            "Step Functions",
            "SNS"
        ]
    },
    {
        "id": "q387",
        "category": "Serverless",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「Webやモバイルアプリのユーザー認証・認可とID管理を提供する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "EventBridge",
            "Step Functions",
            "Fargate",
            "Cognito"
        ],
        "answer": 3,
        "explanation": "要件の中心は「Webやモバイルアプリのユーザー認証・認可とID管理を提供する」です。したがってCognitoを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "EventBridgeは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Step Functionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Fargateは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Cognitoは、Webやモバイルアプリのユーザー認証・認可とID管理を提供するための選択肢です。"
        ],
        "services": [
            "Cognito",
            "EventBridge",
            "Step Functions",
            "Fargate"
        ]
    },
    {
        "id": "q388",
        "category": "Serverless",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「Webやモバイルアプリのユーザー認証・認可とID管理を提供する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Fargate",
            "Cognito",
            "AppSync",
            "Step Functions"
        ],
        "answer": 1,
        "explanation": "要件の中心は「Webやモバイルアプリのユーザー認証・認可とID管理を提供する」です。したがってCognitoを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Fargateは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Cognitoは、Webやモバイルアプリのユーザー認証・認可とID管理を提供するための選択肢です。",
            "AppSyncは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Step Functionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Cognito",
            "Fargate",
            "AppSync",
            "Step Functions"
        ]
    },
    {
        "id": "q389",
        "category": "Serverless",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「Webやモバイルアプリのユーザー認証・認可とID管理を提供する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Fargate",
            "AppSync",
            "S3",
            "Cognito"
        ],
        "answer": 3,
        "explanation": "要件の中心は「Webやモバイルアプリのユーザー認証・認可とID管理を提供する」です。したがってCognitoを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Fargateは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "AppSyncは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Cognitoは、Webやモバイルアプリのユーザー認証・認可とID管理を提供するための選択肢です。"
        ],
        "services": [
            "Cognito",
            "Fargate",
            "AppSync",
            "S3"
        ]
    },
    {
        "id": "q390",
        "category": "Serverless",
        "difficulty": "やや難",
        "question": "設計レビューで「Webやモバイルアプリのユーザー認証・認可とID管理を提供する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "S3",
            "AppSync",
            "Lambda",
            "Cognito"
        ],
        "answer": 3,
        "explanation": "要件の中心は「Webやモバイルアプリのユーザー認証・認可とID管理を提供する」です。したがってCognitoを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "AppSyncは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Lambdaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Cognitoは、Webやモバイルアプリのユーザー認証・認可とID管理を提供するための選択肢です。"
        ],
        "services": [
            "Cognito",
            "S3",
            "AppSync",
            "Lambda"
        ]
    },
    {
        "id": "q391",
        "category": "Serverless",
        "difficulty": "標準",
        "question": "企業のAWS環境で「GraphQL APIを提供し複数データソースを統合する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "AppSync",
            "S3",
            "Fargate",
            "Cognito"
        ],
        "answer": 0,
        "explanation": "要件の中心は「GraphQL APIを提供し複数データソースを統合する」です。したがってAppSyncを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。AppSyncは、GraphQL APIを提供し複数データソースを統合するための選択肢です。",
            "S3は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Fargateは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Cognitoは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "AppSync",
            "S3",
            "Fargate",
            "Cognito"
        ]
    },
    {
        "id": "q392",
        "category": "Serverless",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「GraphQL APIを提供し複数データソースを統合する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Lambda",
            "AppSync",
            "Cognito",
            "S3"
        ],
        "answer": 1,
        "explanation": "要件の中心は「GraphQL APIを提供し複数データソースを統合する」です。したがってAppSyncを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Lambdaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。AppSyncは、GraphQL APIを提供し複数データソースを統合するための選択肢です。",
            "Cognitoは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "AppSync",
            "Lambda",
            "Cognito",
            "S3"
        ]
    },
    {
        "id": "q393",
        "category": "Serverless",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「GraphQL APIを提供し複数データソースを統合する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Lambda",
            "AppSync",
            "S3",
            "API Gateway"
        ],
        "answer": 1,
        "explanation": "要件の中心は「GraphQL APIを提供し複数データソースを統合する」です。したがってAppSyncを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Lambdaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。AppSyncは、GraphQL APIを提供し複数データソースを統合するための選択肢です。",
            "S3は別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "API Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "AppSync",
            "Lambda",
            "S3",
            "API Gateway"
        ]
    },
    {
        "id": "q394",
        "category": "Serverless",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「GraphQL APIを提供し複数データソースを統合する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Lambda",
            "AppSync",
            "SQS",
            "API Gateway"
        ],
        "answer": 1,
        "explanation": "要件の中心は「GraphQL APIを提供し複数データソースを統合する」です。したがってAppSyncを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Lambdaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。AppSyncは、GraphQL APIを提供し複数データソースを統合するための選択肢です。",
            "SQSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "API Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "AppSync",
            "Lambda",
            "SQS",
            "API Gateway"
        ]
    },
    {
        "id": "q395",
        "category": "Serverless",
        "difficulty": "やや難",
        "question": "設計レビューで「GraphQL APIを提供し複数データソースを統合する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "AppSync",
            "API Gateway",
            "SNS",
            "SQS"
        ],
        "answer": 0,
        "explanation": "要件の中心は「GraphQL APIを提供し複数データソースを統合する」です。したがってAppSyncを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。AppSyncは、GraphQL APIを提供し複数データソースを統合するための選択肢です。",
            "API Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "SNSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "SQSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "AppSync",
            "API Gateway",
            "SNS",
            "SQS"
        ]
    },
    {
        "id": "q396",
        "category": "Serverless",
        "difficulty": "標準",
        "question": "企業のAWS環境で「サーバーを管理せず静的HTML/CSS/JSをオブジェクトとして配信する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "S3",
            "API Gateway",
            "SQS",
            "Lambda"
        ],
        "answer": 0,
        "explanation": "要件の中心は「サーバーを管理せず静的HTML/CSS/JSをオブジェクトとして配信する」です。したがってS3を選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。S3は、サーバーを管理せず静的HTML/CSS/JSをオブジェクトとして配信するための選択肢です。",
            "API Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "SQSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Lambdaは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3",
            "API Gateway",
            "SQS",
            "Lambda"
        ]
    },
    {
        "id": "q397",
        "category": "Serverless",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「サーバーを管理せず静的HTML/CSS/JSをオブジェクトとして配信する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "SNS",
            "SQS",
            "API Gateway",
            "S3"
        ],
        "answer": 3,
        "explanation": "要件の中心は「サーバーを管理せず静的HTML/CSS/JSをオブジェクトとして配信する」です。したがってS3を選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "SNSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "SQSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "API Gatewayは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3は、サーバーを管理せず静的HTML/CSS/JSをオブジェクトとして配信するための選択肢です。"
        ],
        "services": [
            "S3",
            "SNS",
            "SQS",
            "API Gateway"
        ]
    },
    {
        "id": "q398",
        "category": "Serverless",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「サーバーを管理せず静的HTML/CSS/JSをオブジェクトとして配信する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "EventBridge",
            "SQS",
            "S3",
            "SNS"
        ],
        "answer": 2,
        "explanation": "要件の中心は「サーバーを管理せず静的HTML/CSS/JSをオブジェクトとして配信する」です。したがってS3を選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "EventBridgeは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "SQSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3は、サーバーを管理せず静的HTML/CSS/JSをオブジェクトとして配信するための選択肢です。",
            "SNSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3",
            "EventBridge",
            "SQS",
            "SNS"
        ]
    },
    {
        "id": "q399",
        "category": "Serverless",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「サーバーを管理せず静的HTML/CSS/JSをオブジェクトとして配信する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "EventBridge",
            "SNS",
            "S3",
            "Step Functions"
        ],
        "answer": 2,
        "explanation": "要件の中心は「サーバーを管理せず静的HTML/CSS/JSをオブジェクトとして配信する」です。したがってS3を選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "EventBridgeは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "SNSは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3は、サーバーを管理せず静的HTML/CSS/JSをオブジェクトとして配信するための選択肢です。",
            "Step Functionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3",
            "EventBridge",
            "SNS",
            "Step Functions"
        ]
    },
    {
        "id": "q400",
        "category": "Serverless",
        "difficulty": "やや難",
        "question": "設計レビューで「サーバーを管理せず静的HTML/CSS/JSをオブジェクトとして配信する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Step Functions",
            "Fargate",
            "S3",
            "EventBridge"
        ],
        "answer": 2,
        "explanation": "要件の中心は「サーバーを管理せず静的HTML/CSS/JSをオブジェクトとして配信する」です。したがってS3を選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Step Functionsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Fargateは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3は、サーバーを管理せず静的HTML/CSS/JSをオブジェクトとして配信するための選択肢です。",
            "EventBridgeは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3",
            "Step Functions",
            "Fargate",
            "EventBridge"
        ]
    },
    {
        "id": "q401",
        "category": "High Availability / DR",
        "difficulty": "標準",
        "question": "企業のAWS環境で「複数AWSサービスのバックアップをポリシーで一元管理する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "AWS Backup",
            "Backup and Restore",
            "Pilot Light",
            "Warm Standby"
        ],
        "answer": 0,
        "explanation": "要件の中心は「複数AWSサービスのバックアップをポリシーで一元管理する」です。したがってAWS Backupを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。AWS Backupは、複数AWSサービスのバックアップをポリシーで一元管理するための選択肢です。",
            "Backup and Restoreは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Pilot Lightは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Warm Standbyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "AWS Backup",
            "Backup and Restore",
            "Pilot Light",
            "Warm Standby"
        ]
    },
    {
        "id": "q402",
        "category": "High Availability / DR",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「複数AWSサービスのバックアップをポリシーで一元管理する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Warm Standby",
            "Active/Active",
            "Pilot Light",
            "AWS Backup"
        ],
        "answer": 3,
        "explanation": "要件の中心は「複数AWSサービスのバックアップをポリシーで一元管理する」です。したがってAWS Backupを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Warm Standbyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Active/Activeは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Pilot Lightは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。AWS Backupは、複数AWSサービスのバックアップをポリシーで一元管理するための選択肢です。"
        ],
        "services": [
            "AWS Backup",
            "Warm Standby",
            "Active/Active",
            "Pilot Light"
        ]
    },
    {
        "id": "q403",
        "category": "High Availability / DR",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「複数AWSサービスのバックアップをポリシーで一元管理する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Active/Active",
            "AWS Backup",
            "Warm Standby",
            "Health Check"
        ],
        "answer": 1,
        "explanation": "要件の中心は「複数AWSサービスのバックアップをポリシーで一元管理する」です。したがってAWS Backupを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Active/Activeは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。AWS Backupは、複数AWSサービスのバックアップをポリシーで一元管理するための選択肢です。",
            "Warm Standbyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "AWS Backup",
            "Active/Active",
            "Warm Standby",
            "Health Check"
        ]
    },
    {
        "id": "q404",
        "category": "High Availability / DR",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「複数AWSサービスのバックアップをポリシーで一元管理する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "AWS Backup",
            "Active/Active",
            "Health Check",
            "Aurora Global Database"
        ],
        "answer": 0,
        "explanation": "要件の中心は「複数AWSサービスのバックアップをポリシーで一元管理する」です。したがってAWS Backupを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。AWS Backupは、複数AWSサービスのバックアップをポリシーで一元管理するための選択肢です。",
            "Active/Activeは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Aurora Global Databaseは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "AWS Backup",
            "Active/Active",
            "Health Check",
            "Aurora Global Database"
        ]
    },
    {
        "id": "q405",
        "category": "High Availability / DR",
        "difficulty": "やや難",
        "question": "設計レビューで「複数AWSサービスのバックアップをポリシーで一元管理する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "AWS Backup",
            "S3 CRR",
            "Aurora Global Database",
            "Health Check"
        ],
        "answer": 0,
        "explanation": "要件の中心は「複数AWSサービスのバックアップをポリシーで一元管理する」です。したがってAWS Backupを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。AWS Backupは、複数AWSサービスのバックアップをポリシーで一元管理するための選択肢です。",
            "S3 CRRは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Aurora Global Databaseは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "AWS Backup",
            "S3 CRR",
            "Aurora Global Database",
            "Health Check"
        ]
    },
    {
        "id": "q406",
        "category": "High Availability / DR",
        "difficulty": "標準",
        "question": "企業のAWS環境で「バックアップから障害環境を復元する低コスト寄りのDR方式を採用する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Active/Active",
            "Backup and Restore",
            "Health Check",
            "Aurora Global Database"
        ],
        "answer": 1,
        "explanation": "要件の中心は「バックアップから障害環境を復元する低コスト寄りのDR方式を採用する」です。したがってBackup and Restoreを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Active/Activeは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Backup and Restoreは、バックアップから障害環境を復元する低コスト寄りのDR方式を採用するための選択肢です。",
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Aurora Global Databaseは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Backup and Restore",
            "Active/Active",
            "Health Check",
            "Aurora Global Database"
        ]
    },
    {
        "id": "q407",
        "category": "High Availability / DR",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「バックアップから障害環境を復元する低コスト寄りのDR方式を採用する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Backup and Restore",
            "Aurora Global Database",
            "Health Check",
            "S3 CRR"
        ],
        "answer": 0,
        "explanation": "要件の中心は「バックアップから障害環境を復元する低コスト寄りのDR方式を採用する」です。したがってBackup and Restoreを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Backup and Restoreは、バックアップから障害環境を復元する低コスト寄りのDR方式を採用するための選択肢です。",
            "Aurora Global Databaseは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 CRRは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Backup and Restore",
            "Aurora Global Database",
            "Health Check",
            "S3 CRR"
        ]
    },
    {
        "id": "q408",
        "category": "High Availability / DR",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「バックアップから障害環境を復元する低コスト寄りのDR方式を採用する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "RTO",
            "Backup and Restore",
            "S3 CRR",
            "Aurora Global Database"
        ],
        "answer": 1,
        "explanation": "要件の中心は「バックアップから障害環境を復元する低コスト寄りのDR方式を採用する」です。したがってBackup and Restoreを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "RTOは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Backup and Restoreは、バックアップから障害環境を復元する低コスト寄りのDR方式を採用するための選択肢です。",
            "S3 CRRは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Aurora Global Databaseは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Backup and Restore",
            "RTO",
            "S3 CRR",
            "Aurora Global Database"
        ]
    },
    {
        "id": "q409",
        "category": "High Availability / DR",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「バックアップから障害環境を復元する低コスト寄りのDR方式を採用する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "RTO",
            "RPO",
            "Backup and Restore",
            "S3 CRR"
        ],
        "answer": 2,
        "explanation": "要件の中心は「バックアップから障害環境を復元する低コスト寄りのDR方式を採用する」です。したがってBackup and Restoreを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "RTOは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RPOは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Backup and Restoreは、バックアップから障害環境を復元する低コスト寄りのDR方式を採用するための選択肢です。",
            "S3 CRRは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Backup and Restore",
            "RTO",
            "RPO",
            "S3 CRR"
        ]
    },
    {
        "id": "q410",
        "category": "High Availability / DR",
        "difficulty": "やや難",
        "question": "設計レビューで「バックアップから障害環境を復元する低コスト寄りのDR方式を採用する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "AWS Backup",
            "Backup and Restore",
            "RTO",
            "RPO"
        ],
        "answer": 1,
        "explanation": "要件の中心は「バックアップから障害環境を復元する低コスト寄りのDR方式を採用する」です。したがってBackup and Restoreを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "AWS Backupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Backup and Restoreは、バックアップから障害環境を復元する低コスト寄りのDR方式を採用するための選択肢です。",
            "RTOは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RPOは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Backup and Restore",
            "AWS Backup",
            "RTO",
            "RPO"
        ]
    },
    {
        "id": "q411",
        "category": "High Availability / DR",
        "difficulty": "標準",
        "question": "企業のAWS環境で「最小限の基盤を別環境で稼働させ障害時に本格的にスケールする」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "RPO",
            "S3 CRR",
            "RTO",
            "Pilot Light"
        ],
        "answer": 3,
        "explanation": "要件の中心は「最小限の基盤を別環境で稼働させ障害時に本格的にスケールする」です。したがってPilot Lightを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "RPOは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 CRRは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RTOは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Pilot Lightは、最小限の基盤を別環境で稼働させ障害時に本格的にスケールするための選択肢です。"
        ],
        "services": [
            "Pilot Light",
            "RPO",
            "S3 CRR",
            "RTO"
        ]
    },
    {
        "id": "q412",
        "category": "High Availability / DR",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「最小限の基盤を別環境で稼働させ障害時に本格的にスケールする」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "RTO",
            "Pilot Light",
            "RPO",
            "AWS Backup"
        ],
        "answer": 1,
        "explanation": "要件の中心は「最小限の基盤を別環境で稼働させ障害時に本格的にスケールする」です。したがってPilot Lightを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "RTOは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Pilot Lightは、最小限の基盤を別環境で稼働させ障害時に本格的にスケールするための選択肢です。",
            "RPOは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "AWS Backupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Pilot Light",
            "RTO",
            "RPO",
            "AWS Backup"
        ]
    },
    {
        "id": "q413",
        "category": "High Availability / DR",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「最小限の基盤を別環境で稼働させ障害時に本格的にスケールする」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Pilot Light",
            "Backup and Restore",
            "RPO",
            "AWS Backup"
        ],
        "answer": 0,
        "explanation": "要件の中心は「最小限の基盤を別環境で稼働させ障害時に本格的にスケールする」です。したがってPilot Lightを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Pilot Lightは、最小限の基盤を別環境で稼働させ障害時に本格的にスケールするための選択肢です。",
            "Backup and Restoreは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RPOは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "AWS Backupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Pilot Light",
            "Backup and Restore",
            "RPO",
            "AWS Backup"
        ]
    },
    {
        "id": "q414",
        "category": "High Availability / DR",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「最小限の基盤を別環境で稼働させ障害時に本格的にスケールする」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Backup and Restore",
            "Pilot Light",
            "AWS Backup",
            "Warm Standby"
        ],
        "answer": 1,
        "explanation": "要件の中心は「最小限の基盤を別環境で稼働させ障害時に本格的にスケールする」です。したがってPilot Lightを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Backup and Restoreは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Pilot Lightは、最小限の基盤を別環境で稼働させ障害時に本格的にスケールするための選択肢です。",
            "AWS Backupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Warm Standbyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Pilot Light",
            "Backup and Restore",
            "AWS Backup",
            "Warm Standby"
        ]
    },
    {
        "id": "q415",
        "category": "High Availability / DR",
        "difficulty": "やや難",
        "question": "設計レビューで「最小限の基盤を別環境で稼働させ障害時に本格的にスケールする」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Active/Active",
            "Warm Standby",
            "Backup and Restore",
            "Pilot Light"
        ],
        "answer": 3,
        "explanation": "要件の中心は「最小限の基盤を別環境で稼働させ障害時に本格的にスケールする」です。したがってPilot Lightを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Active/Activeは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Warm Standbyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Backup and Restoreは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Pilot Lightは、最小限の基盤を別環境で稼働させ障害時に本格的にスケールするための選択肢です。"
        ],
        "services": [
            "Pilot Light",
            "Active/Active",
            "Warm Standby",
            "Backup and Restore"
        ]
    },
    {
        "id": "q416",
        "category": "High Availability / DR",
        "difficulty": "標準",
        "question": "企業のAWS環境で「縮小した本番環境を常時稼働させ障害時にスケールアップする」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "AWS Backup",
            "Warm Standby",
            "Backup and Restore",
            "Pilot Light"
        ],
        "answer": 1,
        "explanation": "要件の中心は「縮小した本番環境を常時稼働させ障害時にスケールアップする」です。したがってWarm Standbyを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "AWS Backupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Warm Standbyは、縮小した本番環境を常時稼働させ障害時にスケールアップするための選択肢です。",
            "Backup and Restoreは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Pilot Lightは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Warm Standby",
            "AWS Backup",
            "Backup and Restore",
            "Pilot Light"
        ]
    },
    {
        "id": "q417",
        "category": "High Availability / DR",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「縮小した本番環境を常時稼働させ障害時にスケールアップする」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Warm Standby",
            "Pilot Light",
            "Active/Active",
            "Backup and Restore"
        ],
        "answer": 0,
        "explanation": "要件の中心は「縮小した本番環境を常時稼働させ障害時にスケールアップする」です。したがってWarm Standbyを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Warm Standbyは、縮小した本番環境を常時稼働させ障害時にスケールアップするための選択肢です。",
            "Pilot Lightは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Active/Activeは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Backup and Restoreは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Warm Standby",
            "Pilot Light",
            "Active/Active",
            "Backup and Restore"
        ]
    },
    {
        "id": "q418",
        "category": "High Availability / DR",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「縮小した本番環境を常時稼働させ障害時にスケールアップする」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Health Check",
            "Pilot Light",
            "Active/Active",
            "Warm Standby"
        ],
        "answer": 3,
        "explanation": "要件の中心は「縮小した本番環境を常時稼働させ障害時にスケールアップする」です。したがってWarm Standbyを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Pilot Lightは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Active/Activeは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Warm Standbyは、縮小した本番環境を常時稼働させ障害時にスケールアップするための選択肢です。"
        ],
        "services": [
            "Warm Standby",
            "Health Check",
            "Pilot Light",
            "Active/Active"
        ]
    },
    {
        "id": "q419",
        "category": "High Availability / DR",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「縮小した本番環境を常時稼働させ障害時にスケールアップする」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Health Check",
            "Aurora Global Database",
            "Warm Standby",
            "Active/Active"
        ],
        "answer": 2,
        "explanation": "要件の中心は「縮小した本番環境を常時稼働させ障害時にスケールアップする」です。したがってWarm Standbyを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Aurora Global Databaseは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Warm Standbyは、縮小した本番環境を常時稼働させ障害時にスケールアップするための選択肢です。",
            "Active/Activeは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Warm Standby",
            "Health Check",
            "Aurora Global Database",
            "Active/Active"
        ]
    },
    {
        "id": "q420",
        "category": "High Availability / DR",
        "difficulty": "やや難",
        "question": "設計レビューで「縮小した本番環境を常時稼働させ障害時にスケールアップする」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Health Check",
            "Warm Standby",
            "S3 CRR",
            "Aurora Global Database"
        ],
        "answer": 1,
        "explanation": "要件の中心は「縮小した本番環境を常時稼働させ障害時にスケールアップする」です。したがってWarm Standbyを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Warm Standbyは、縮小した本番環境を常時稼働させ障害時にスケールアップするための選択肢です。",
            "S3 CRRは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Aurora Global Databaseは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Warm Standby",
            "Health Check",
            "S3 CRR",
            "Aurora Global Database"
        ]
    },
    {
        "id": "q421",
        "category": "High Availability / DR",
        "difficulty": "標準",
        "question": "企業のAWS環境で「複数環境を同時稼働させ障害時の切替時間を最小化する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Health Check",
            "Warm Standby",
            "Aurora Global Database",
            "Active/Active"
        ],
        "answer": 3,
        "explanation": "要件の中心は「複数環境を同時稼働させ障害時の切替時間を最小化する」です。したがってActive/Activeを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Warm Standbyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Aurora Global Databaseは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Active/Activeは、複数環境を同時稼働させ障害時の切替時間を最小化するための選択肢です。"
        ],
        "services": [
            "Active/Active",
            "Health Check",
            "Warm Standby",
            "Aurora Global Database"
        ]
    },
    {
        "id": "q422",
        "category": "High Availability / DR",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「複数環境を同時稼働させ障害時の切替時間を最小化する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Health Check",
            "Active/Active",
            "S3 CRR",
            "Aurora Global Database"
        ],
        "answer": 1,
        "explanation": "要件の中心は「複数環境を同時稼働させ障害時の切替時間を最小化する」です。したがってActive/Activeを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Active/Activeは、複数環境を同時稼働させ障害時の切替時間を最小化するための選択肢です。",
            "S3 CRRは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Aurora Global Databaseは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Active/Active",
            "Health Check",
            "S3 CRR",
            "Aurora Global Database"
        ]
    },
    {
        "id": "q423",
        "category": "High Availability / DR",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「複数環境を同時稼働させ障害時の切替時間を最小化する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Active/Active",
            "Aurora Global Database",
            "RTO",
            "S3 CRR"
        ],
        "answer": 0,
        "explanation": "要件の中心は「複数環境を同時稼働させ障害時の切替時間を最小化する」です。したがってActive/Activeを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Active/Activeは、複数環境を同時稼働させ障害時の切替時間を最小化するための選択肢です。",
            "Aurora Global Databaseは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RTOは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 CRRは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Active/Active",
            "Aurora Global Database",
            "RTO",
            "S3 CRR"
        ]
    },
    {
        "id": "q424",
        "category": "High Availability / DR",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「複数環境を同時稼働させ障害時の切替時間を最小化する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "RPO",
            "Active/Active",
            "S3 CRR",
            "RTO"
        ],
        "answer": 1,
        "explanation": "要件の中心は「複数環境を同時稼働させ障害時の切替時間を最小化する」です。したがってActive/Activeを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "RPOは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Active/Activeは、複数環境を同時稼働させ障害時の切替時間を最小化するための選択肢です。",
            "S3 CRRは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RTOは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Active/Active",
            "RPO",
            "S3 CRR",
            "RTO"
        ]
    },
    {
        "id": "q425",
        "category": "High Availability / DR",
        "difficulty": "やや難",
        "question": "設計レビューで「複数環境を同時稼働させ障害時の切替時間を最小化する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "RTO",
            "AWS Backup",
            "Active/Active",
            "RPO"
        ],
        "answer": 2,
        "explanation": "要件の中心は「複数環境を同時稼働させ障害時の切替時間を最小化する」です。したがってActive/Activeを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "RTOは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "AWS Backupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Active/Activeは、複数環境を同時稼働させ障害時の切替時間を最小化するための選択肢です。",
            "RPOは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Active/Active",
            "RTO",
            "AWS Backup",
            "RPO"
        ]
    },
    {
        "id": "q426",
        "category": "High Availability / DR",
        "difficulty": "標準",
        "question": "企業のAWS環境で「エンドポイントの状態を監視しDNSフェイルオーバーなどに利用する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "S3 CRR",
            "RTO",
            "RPO",
            "Health Check"
        ],
        "answer": 3,
        "explanation": "要件の中心は「エンドポイントの状態を監視しDNSフェイルオーバーなどに利用する」です。したがってHealth Checkを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 CRRは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RTOは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RPOは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Health Checkは、エンドポイントの状態を監視しDNSフェイルオーバーなどに利用するための選択肢です。"
        ],
        "services": [
            "Health Check",
            "S3 CRR",
            "RTO",
            "RPO"
        ]
    },
    {
        "id": "q427",
        "category": "High Availability / DR",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「エンドポイントの状態を監視しDNSフェイルオーバーなどに利用する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "AWS Backup",
            "RTO",
            "RPO",
            "Health Check"
        ],
        "answer": 3,
        "explanation": "要件の中心は「エンドポイントの状態を監視しDNSフェイルオーバーなどに利用する」です。したがってHealth Checkを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "AWS Backupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RTOは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RPOは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Health Checkは、エンドポイントの状態を監視しDNSフェイルオーバーなどに利用するための選択肢です。"
        ],
        "services": [
            "Health Check",
            "AWS Backup",
            "RTO",
            "RPO"
        ]
    },
    {
        "id": "q428",
        "category": "High Availability / DR",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「エンドポイントの状態を監視しDNSフェイルオーバーなどに利用する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "RPO",
            "Backup and Restore",
            "AWS Backup",
            "Health Check"
        ],
        "answer": 3,
        "explanation": "要件の中心は「エンドポイントの状態を監視しDNSフェイルオーバーなどに利用する」です。したがってHealth Checkを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "RPOは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Backup and Restoreは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "AWS Backupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Health Checkは、エンドポイントの状態を監視しDNSフェイルオーバーなどに利用するための選択肢です。"
        ],
        "services": [
            "Health Check",
            "RPO",
            "Backup and Restore",
            "AWS Backup"
        ]
    },
    {
        "id": "q429",
        "category": "High Availability / DR",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「エンドポイントの状態を監視しDNSフェイルオーバーなどに利用する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "AWS Backup",
            "Pilot Light",
            "Backup and Restore",
            "Health Check"
        ],
        "answer": 3,
        "explanation": "要件の中心は「エンドポイントの状態を監視しDNSフェイルオーバーなどに利用する」です。したがってHealth Checkを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "AWS Backupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Pilot Lightは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Backup and Restoreは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Health Checkは、エンドポイントの状態を監視しDNSフェイルオーバーなどに利用するための選択肢です。"
        ],
        "services": [
            "Health Check",
            "AWS Backup",
            "Pilot Light",
            "Backup and Restore"
        ]
    },
    {
        "id": "q430",
        "category": "High Availability / DR",
        "difficulty": "やや難",
        "question": "設計レビューで「エンドポイントの状態を監視しDNSフェイルオーバーなどに利用する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Health Check",
            "Warm Standby",
            "Backup and Restore",
            "Pilot Light"
        ],
        "answer": 0,
        "explanation": "要件の中心は「エンドポイントの状態を監視しDNSフェイルオーバーなどに利用する」です。したがってHealth Checkを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Health Checkは、エンドポイントの状態を監視しDNSフェイルオーバーなどに利用するための選択肢です。",
            "Warm Standbyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Backup and Restoreは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Pilot Lightは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Health Check",
            "Warm Standby",
            "Backup and Restore",
            "Pilot Light"
        ]
    },
    {
        "id": "q431",
        "category": "High Availability / DR",
        "difficulty": "標準",
        "question": "企業のAWS環境で「複数リージョンへAuroraデータを低遅延でレプリケーションしDRを実現する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Pilot Light",
            "AWS Backup",
            "Backup and Restore",
            "Aurora Global Database"
        ],
        "answer": 3,
        "explanation": "要件の中心は「複数リージョンへAuroraデータを低遅延でレプリケーションしDRを実現する」です。したがってAurora Global Databaseを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Pilot Lightは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "AWS Backupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Backup and Restoreは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Aurora Global Databaseは、複数リージョンへAuroraデータを低遅延でレプリケーションしDRを実現するための選択肢です。"
        ],
        "services": [
            "Aurora Global Database",
            "Pilot Light",
            "AWS Backup",
            "Backup and Restore"
        ]
    },
    {
        "id": "q432",
        "category": "High Availability / DR",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「複数リージョンへAuroraデータを低遅延でレプリケーションしDRを実現する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Backup and Restore",
            "Pilot Light",
            "Warm Standby",
            "Aurora Global Database"
        ],
        "answer": 3,
        "explanation": "要件の中心は「複数リージョンへAuroraデータを低遅延でレプリケーションしDRを実現する」です。したがってAurora Global Databaseを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Backup and Restoreは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Pilot Lightは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Warm Standbyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Aurora Global Databaseは、複数リージョンへAuroraデータを低遅延でレプリケーションしDRを実現するための選択肢です。"
        ],
        "services": [
            "Aurora Global Database",
            "Backup and Restore",
            "Pilot Light",
            "Warm Standby"
        ]
    },
    {
        "id": "q433",
        "category": "High Availability / DR",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「複数リージョンへAuroraデータを低遅延でレプリケーションしDRを実現する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Warm Standby",
            "Pilot Light",
            "Active/Active",
            "Aurora Global Database"
        ],
        "answer": 3,
        "explanation": "要件の中心は「複数リージョンへAuroraデータを低遅延でレプリケーションしDRを実現する」です。したがってAurora Global Databaseを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Warm Standbyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Pilot Lightは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Active/Activeは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Aurora Global Databaseは、複数リージョンへAuroraデータを低遅延でレプリケーションしDRを実現するための選択肢です。"
        ],
        "services": [
            "Aurora Global Database",
            "Warm Standby",
            "Pilot Light",
            "Active/Active"
        ]
    },
    {
        "id": "q434",
        "category": "High Availability / DR",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「複数リージョンへAuroraデータを低遅延でレプリケーションしDRを実現する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Warm Standby",
            "Aurora Global Database",
            "Active/Active",
            "Health Check"
        ],
        "answer": 1,
        "explanation": "要件の中心は「複数リージョンへAuroraデータを低遅延でレプリケーションしDRを実現する」です。したがってAurora Global Databaseを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Warm Standbyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Aurora Global Databaseは、複数リージョンへAuroraデータを低遅延でレプリケーションしDRを実現するための選択肢です。",
            "Active/Activeは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Aurora Global Database",
            "Warm Standby",
            "Active/Active",
            "Health Check"
        ]
    },
    {
        "id": "q435",
        "category": "High Availability / DR",
        "difficulty": "やや難",
        "question": "設計レビューで「複数リージョンへAuroraデータを低遅延でレプリケーションしDRを実現する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "S3 CRR",
            "Aurora Global Database",
            "Active/Active",
            "Health Check"
        ],
        "answer": 1,
        "explanation": "要件の中心は「複数リージョンへAuroraデータを低遅延でレプリケーションしDRを実現する」です。したがってAurora Global Databaseを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 CRRは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Aurora Global Databaseは、複数リージョンへAuroraデータを低遅延でレプリケーションしDRを実現するための選択肢です。",
            "Active/Activeは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Aurora Global Database",
            "S3 CRR",
            "Active/Active",
            "Health Check"
        ]
    },
    {
        "id": "q436",
        "category": "High Availability / DR",
        "difficulty": "標準",
        "question": "企業のAWS環境で「S3オブジェクトを別リージョンへ自動複製してリージョン障害へ備える」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Active/Active",
            "S3 CRR",
            "Health Check",
            "Warm Standby"
        ],
        "answer": 1,
        "explanation": "要件の中心は「S3オブジェクトを別リージョンへ自動複製してリージョン障害へ備える」です。したがってS3 CRRを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Active/Activeは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 CRRは、S3オブジェクトを別リージョンへ自動複製してリージョン障害へ備えるための選択肢です。",
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Warm Standbyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 CRR",
            "Active/Active",
            "Health Check",
            "Warm Standby"
        ]
    },
    {
        "id": "q437",
        "category": "High Availability / DR",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「S3オブジェクトを別リージョンへ自動複製してリージョン障害へ備える」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Aurora Global Database",
            "Active/Active",
            "Health Check",
            "S3 CRR"
        ],
        "answer": 3,
        "explanation": "要件の中心は「S3オブジェクトを別リージョンへ自動複製してリージョン障害へ備える」です。したがってS3 CRRを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Aurora Global Databaseは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Active/Activeは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 CRRは、S3オブジェクトを別リージョンへ自動複製してリージョン障害へ備えるための選択肢です。"
        ],
        "services": [
            "S3 CRR",
            "Aurora Global Database",
            "Active/Active",
            "Health Check"
        ]
    },
    {
        "id": "q438",
        "category": "High Availability / DR",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「S3オブジェクトを別リージョンへ自動複製してリージョン障害へ備える」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Health Check",
            "S3 CRR",
            "RTO",
            "Aurora Global Database"
        ],
        "answer": 1,
        "explanation": "要件の中心は「S3オブジェクトを別リージョンへ自動複製してリージョン障害へ備える」です。したがってS3 CRRを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 CRRは、S3オブジェクトを別リージョンへ自動複製してリージョン障害へ備えるための選択肢です。",
            "RTOは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Aurora Global Databaseは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 CRR",
            "Health Check",
            "RTO",
            "Aurora Global Database"
        ]
    },
    {
        "id": "q439",
        "category": "High Availability / DR",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「S3オブジェクトを別リージョンへ自動複製してリージョン障害へ備える」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "RTO",
            "Aurora Global Database",
            "RPO",
            "S3 CRR"
        ],
        "answer": 3,
        "explanation": "要件の中心は「S3オブジェクトを別リージョンへ自動複製してリージョン障害へ備える」です。したがってS3 CRRを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "RTOは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Aurora Global Databaseは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RPOは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 CRRは、S3オブジェクトを別リージョンへ自動複製してリージョン障害へ備えるための選択肢です。"
        ],
        "services": [
            "S3 CRR",
            "RTO",
            "Aurora Global Database",
            "RPO"
        ]
    },
    {
        "id": "q440",
        "category": "High Availability / DR",
        "difficulty": "やや難",
        "question": "設計レビューで「S3オブジェクトを別リージョンへ自動複製してリージョン障害へ備える」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "S3 CRR",
            "RPO",
            "AWS Backup",
            "RTO"
        ],
        "answer": 0,
        "explanation": "要件の中心は「S3オブジェクトを別リージョンへ自動複製してリージョン障害へ備える」です。したがってS3 CRRを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。S3 CRRは、S3オブジェクトを別リージョンへ自動複製してリージョン障害へ備えるための選択肢です。",
            "RPOは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "AWS Backupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "RTOは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 CRR",
            "RPO",
            "AWS Backup",
            "RTO"
        ]
    },
    {
        "id": "q441",
        "category": "High Availability / DR",
        "difficulty": "標準",
        "question": "企業のAWS環境で「障害発生からサービス復旧までに許容される最大時間を定義する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Aurora Global Database",
            "S3 CRR",
            "RTO",
            "RPO"
        ],
        "answer": 2,
        "explanation": "要件の中心は「障害発生からサービス復旧までに許容される最大時間を定義する」です。したがってRTOを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Aurora Global Databaseは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 CRRは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。RTOは、障害発生からサービス復旧までに許容される最大時間を定義するための選択肢です。",
            "RPOは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "RTO",
            "Aurora Global Database",
            "S3 CRR",
            "RPO"
        ]
    },
    {
        "id": "q442",
        "category": "High Availability / DR",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「障害発生からサービス復旧までに許容される最大時間を定義する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "S3 CRR",
            "AWS Backup",
            "RTO",
            "RPO"
        ],
        "answer": 2,
        "explanation": "要件の中心は「障害発生からサービス復旧までに許容される最大時間を定義する」です。したがってRTOを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 CRRは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "AWS Backupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。RTOは、障害発生からサービス復旧までに許容される最大時間を定義するための選択肢です。",
            "RPOは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "RTO",
            "S3 CRR",
            "AWS Backup",
            "RPO"
        ]
    },
    {
        "id": "q443",
        "category": "High Availability / DR",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「障害発生からサービス復旧までに許容される最大時間を定義する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "RPO",
            "Backup and Restore",
            "RTO",
            "AWS Backup"
        ],
        "answer": 2,
        "explanation": "要件の中心は「障害発生からサービス復旧までに許容される最大時間を定義する」です。したがってRTOを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "RPOは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Backup and Restoreは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。RTOは、障害発生からサービス復旧までに許容される最大時間を定義するための選択肢です。",
            "AWS Backupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "RTO",
            "RPO",
            "Backup and Restore",
            "AWS Backup"
        ]
    },
    {
        "id": "q444",
        "category": "High Availability / DR",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「障害発生からサービス復旧までに許容される最大時間を定義する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Pilot Light",
            "AWS Backup",
            "Backup and Restore",
            "RTO"
        ],
        "answer": 3,
        "explanation": "要件の中心は「障害発生からサービス復旧までに許容される最大時間を定義する」です。したがってRTOを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Pilot Lightは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "AWS Backupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Backup and Restoreは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。RTOは、障害発生からサービス復旧までに許容される最大時間を定義するための選択肢です。"
        ],
        "services": [
            "RTO",
            "Pilot Light",
            "AWS Backup",
            "Backup and Restore"
        ]
    },
    {
        "id": "q445",
        "category": "High Availability / DR",
        "difficulty": "やや難",
        "question": "設計レビューで「障害発生からサービス復旧までに許容される最大時間を定義する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Backup and Restore",
            "RTO",
            "Warm Standby",
            "Pilot Light"
        ],
        "answer": 1,
        "explanation": "要件の中心は「障害発生からサービス復旧までに許容される最大時間を定義する」です。したがってRTOを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Backup and Restoreは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。RTOは、障害発生からサービス復旧までに許容される最大時間を定義するための選択肢です。",
            "Warm Standbyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Pilot Lightは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "RTO",
            "Backup and Restore",
            "Warm Standby",
            "Pilot Light"
        ]
    },
    {
        "id": "q446",
        "category": "High Availability / DR",
        "difficulty": "標準",
        "question": "企業のAWS環境で「障害時に許容できるデータ損失量を時間で定義する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "AWS Backup",
            "RPO",
            "Pilot Light",
            "Backup and Restore"
        ],
        "answer": 1,
        "explanation": "要件の中心は「障害時に許容できるデータ損失量を時間で定義する」です。したがってRPOを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "AWS Backupは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。RPOは、障害時に許容できるデータ損失量を時間で定義するための選択肢です。",
            "Pilot Lightは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Backup and Restoreは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "RPO",
            "AWS Backup",
            "Pilot Light",
            "Backup and Restore"
        ]
    },
    {
        "id": "q447",
        "category": "High Availability / DR",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「障害時に許容できるデータ損失量を時間で定義する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Backup and Restore",
            "Pilot Light",
            "RPO",
            "Warm Standby"
        ],
        "answer": 2,
        "explanation": "要件の中心は「障害時に許容できるデータ損失量を時間で定義する」です。したがってRPOを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Backup and Restoreは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Pilot Lightは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。RPOは、障害時に許容できるデータ損失量を時間で定義するための選択肢です。",
            "Warm Standbyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "RPO",
            "Backup and Restore",
            "Pilot Light",
            "Warm Standby"
        ]
    },
    {
        "id": "q448",
        "category": "High Availability / DR",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「障害時に許容できるデータ損失量を時間で定義する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Pilot Light",
            "Warm Standby",
            "RPO",
            "Active/Active"
        ],
        "answer": 2,
        "explanation": "要件の中心は「障害時に許容できるデータ損失量を時間で定義する」です。したがってRPOを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Pilot Lightは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Warm Standbyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。RPOは、障害時に許容できるデータ損失量を時間で定義するための選択肢です。",
            "Active/Activeは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "RPO",
            "Pilot Light",
            "Warm Standby",
            "Active/Active"
        ]
    },
    {
        "id": "q449",
        "category": "High Availability / DR",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「障害時に許容できるデータ損失量を時間で定義する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "RPO",
            "Warm Standby",
            "Health Check",
            "Active/Active"
        ],
        "answer": 0,
        "explanation": "要件の中心は「障害時に許容できるデータ損失量を時間で定義する」です。したがってRPOを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。RPOは、障害時に許容できるデータ損失量を時間で定義するための選択肢です。",
            "Warm Standbyは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Active/Activeは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "RPO",
            "Warm Standby",
            "Health Check",
            "Active/Active"
        ]
    },
    {
        "id": "q450",
        "category": "High Availability / DR",
        "difficulty": "やや難",
        "question": "設計レビューで「障害時に許容できるデータ損失量を時間で定義する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Active/Active",
            "Aurora Global Database",
            "Health Check",
            "RPO"
        ],
        "answer": 3,
        "explanation": "要件の中心は「障害時に許容できるデータ損失量を時間で定義する」です。したがってRPOを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Active/Activeは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Aurora Global Databaseは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Health Checkは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。RPOは、障害時に許容できるデータ損失量を時間で定義するための選択肢です。"
        ],
        "services": [
            "RPO",
            "Active/Active",
            "Aurora Global Database",
            "Health Check"
        ]
    },
    {
        "id": "q451",
        "category": "Cost Optimization",
        "difficulty": "標準",
        "question": "企業のAWS環境で「AWSコストと使用量を期間・サービスなどの軸で分析する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Reserved Instances",
            "Savings Plans",
            "Cost Explorer",
            "AWS Budgets"
        ],
        "answer": 2,
        "explanation": "要件の中心は「AWSコストと使用量を期間・サービスなどの軸で分析する」です。したがってCost Explorerを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Reserved Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Savings Plansは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Cost Explorerは、AWSコストと使用量を期間・サービスなどの軸で分析するための選択肢です。",
            "AWS Budgetsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Cost Explorer",
            "Reserved Instances",
            "Savings Plans",
            "AWS Budgets"
        ]
    },
    {
        "id": "q452",
        "category": "Cost Optimization",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「AWSコストと使用量を期間・サービスなどの軸で分析する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Cost Explorer",
            "Spot Instances",
            "Reserved Instances",
            "Savings Plans"
        ],
        "answer": 0,
        "explanation": "要件の中心は「AWSコストと使用量を期間・サービスなどの軸で分析する」です。したがってCost Explorerを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Cost Explorerは、AWSコストと使用量を期間・サービスなどの軸で分析するための選択肢です。",
            "Spot Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Reserved Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Savings Plansは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Cost Explorer",
            "Spot Instances",
            "Reserved Instances",
            "Savings Plans"
        ]
    },
    {
        "id": "q453",
        "category": "Cost Optimization",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「AWSコストと使用量を期間・サービスなどの軸で分析する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Reserved Instances",
            "Cost Explorer",
            "Spot Instances",
            "S3 Intelligent-Tiering"
        ],
        "answer": 1,
        "explanation": "要件の中心は「AWSコストと使用量を期間・サービスなどの軸で分析する」です。したがってCost Explorerを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Reserved Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Cost Explorerは、AWSコストと使用量を期間・サービスなどの軸で分析するための選択肢です。",
            "Spot Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Intelligent-Tieringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Cost Explorer",
            "Reserved Instances",
            "Spot Instances",
            "S3 Intelligent-Tiering"
        ]
    },
    {
        "id": "q454",
        "category": "Cost Optimization",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「AWSコストと使用量を期間・サービスなどの軸で分析する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "S3 Glacier",
            "Spot Instances",
            "S3 Intelligent-Tiering",
            "Cost Explorer"
        ],
        "answer": 3,
        "explanation": "要件の中心は「AWSコストと使用量を期間・サービスなどの軸で分析する」です。したがってCost Explorerを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Glacierは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Spot Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Intelligent-Tieringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Cost Explorerは、AWSコストと使用量を期間・サービスなどの軸で分析するための選択肢です。"
        ],
        "services": [
            "Cost Explorer",
            "S3 Glacier",
            "Spot Instances",
            "S3 Intelligent-Tiering"
        ]
    },
    {
        "id": "q455",
        "category": "Cost Optimization",
        "difficulty": "やや難",
        "question": "設計レビューで「AWSコストと使用量を期間・サービスなどの軸で分析する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Right Sizing",
            "S3 Glacier",
            "S3 Intelligent-Tiering",
            "Cost Explorer"
        ],
        "answer": 3,
        "explanation": "要件の中心は「AWSコストと使用量を期間・サービスなどの軸で分析する」です。したがってCost Explorerを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Right Sizingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Glacierは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Intelligent-Tieringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Cost Explorerは、AWSコストと使用量を期間・サービスなどの軸で分析するための選択肢です。"
        ],
        "services": [
            "Cost Explorer",
            "Right Sizing",
            "S3 Glacier",
            "S3 Intelligent-Tiering"
        ]
    },
    {
        "id": "q456",
        "category": "Cost Optimization",
        "difficulty": "標準",
        "question": "企業のAWS環境で「予算や使用量に対するしきい値を設定してアラートを出す」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "S3 Intelligent-Tiering",
            "S3 Glacier",
            "AWS Budgets",
            "Spot Instances"
        ],
        "answer": 2,
        "explanation": "要件の中心は「予算や使用量に対するしきい値を設定してアラートを出す」です。したがってAWS Budgetsを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Intelligent-Tieringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Glacierは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。AWS Budgetsは、予算や使用量に対するしきい値を設定してアラートを出すための選択肢です。",
            "Spot Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "AWS Budgets",
            "S3 Intelligent-Tiering",
            "S3 Glacier",
            "Spot Instances"
        ]
    },
    {
        "id": "q457",
        "category": "Cost Optimization",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「予算や使用量に対するしきい値を設定してアラートを出す」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "S3 Glacier",
            "S3 Intelligent-Tiering",
            "Right Sizing",
            "AWS Budgets"
        ],
        "answer": 3,
        "explanation": "要件の中心は「予算や使用量に対するしきい値を設定してアラートを出す」です。したがってAWS Budgetsを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Glacierは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Intelligent-Tieringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Right Sizingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。AWS Budgetsは、予算や使用量に対するしきい値を設定してアラートを出すための選択肢です。"
        ],
        "services": [
            "AWS Budgets",
            "S3 Glacier",
            "S3 Intelligent-Tiering",
            "Right Sizing"
        ]
    },
    {
        "id": "q458",
        "category": "Cost Optimization",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「予算や使用量に対するしきい値を設定してアラートを出す」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "AWS Budgets",
            "Auto Scaling",
            "Right Sizing",
            "S3 Glacier"
        ],
        "answer": 0,
        "explanation": "要件の中心は「予算や使用量に対するしきい値を設定してアラートを出す」です。したがってAWS Budgetsを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。AWS Budgetsは、予算や使用量に対するしきい値を設定してアラートを出すための選択肢です。",
            "Auto Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Right Sizingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Glacierは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "AWS Budgets",
            "Auto Scaling",
            "Right Sizing",
            "S3 Glacier"
        ]
    },
    {
        "id": "q459",
        "category": "Cost Optimization",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「予算や使用量に対するしきい値を設定してアラートを出す」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Serverless",
            "AWS Budgets",
            "Auto Scaling",
            "Right Sizing"
        ],
        "answer": 1,
        "explanation": "要件の中心は「予算や使用量に対するしきい値を設定してアラートを出す」です。したがってAWS Budgetsを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Serverlessは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。AWS Budgetsは、予算や使用量に対するしきい値を設定してアラートを出すための選択肢です。",
            "Auto Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Right Sizingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "AWS Budgets",
            "Serverless",
            "Auto Scaling",
            "Right Sizing"
        ]
    },
    {
        "id": "q460",
        "category": "Cost Optimization",
        "difficulty": "やや難",
        "question": "設計レビューで「予算や使用量に対するしきい値を設定してアラートを出す」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "AWS Budgets",
            "Auto Scaling",
            "Cost Explorer",
            "Serverless"
        ],
        "answer": 0,
        "explanation": "要件の中心は「予算や使用量に対するしきい値を設定してアラートを出す」です。したがってAWS Budgetsを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。AWS Budgetsは、予算や使用量に対するしきい値を設定してアラートを出すための選択肢です。",
            "Auto Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Cost Explorerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Serverlessは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "AWS Budgets",
            "Auto Scaling",
            "Cost Explorer",
            "Serverless"
        ]
    },
    {
        "id": "q461",
        "category": "Cost Optimization",
        "difficulty": "標準",
        "question": "企業のAWS環境で「一定の利用コミットメントに対してコンピューティング料金の割引を得る」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Right Sizing",
            "Auto Scaling",
            "Serverless",
            "Savings Plans"
        ],
        "answer": 3,
        "explanation": "要件の中心は「一定の利用コミットメントに対してコンピューティング料金の割引を得る」です。したがってSavings Plansを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Right Sizingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Auto Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Serverlessは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Savings Plansは、一定の利用コミットメントに対してコンピューティング料金の割引を得るための選択肢です。"
        ],
        "services": [
            "Savings Plans",
            "Right Sizing",
            "Auto Scaling",
            "Serverless"
        ]
    },
    {
        "id": "q462",
        "category": "Cost Optimization",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「一定の利用コミットメントに対してコンピューティング料金の割引を得る」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Cost Explorer",
            "Auto Scaling",
            "Serverless",
            "Savings Plans"
        ],
        "answer": 3,
        "explanation": "要件の中心は「一定の利用コミットメントに対してコンピューティング料金の割引を得る」です。したがってSavings Plansを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Cost Explorerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Auto Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Serverlessは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Savings Plansは、一定の利用コミットメントに対してコンピューティング料金の割引を得るための選択肢です。"
        ],
        "services": [
            "Savings Plans",
            "Cost Explorer",
            "Auto Scaling",
            "Serverless"
        ]
    },
    {
        "id": "q463",
        "category": "Cost Optimization",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「一定の利用コミットメントに対してコンピューティング料金の割引を得る」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Savings Plans",
            "Serverless",
            "AWS Budgets",
            "Cost Explorer"
        ],
        "answer": 0,
        "explanation": "要件の中心は「一定の利用コミットメントに対してコンピューティング料金の割引を得る」です。したがってSavings Plansを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Savings Plansは、一定の利用コミットメントに対してコンピューティング料金の割引を得るための選択肢です。",
            "Serverlessは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "AWS Budgetsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Cost Explorerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Savings Plans",
            "Serverless",
            "AWS Budgets",
            "Cost Explorer"
        ]
    },
    {
        "id": "q464",
        "category": "Cost Optimization",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「一定の利用コミットメントに対してコンピューティング料金の割引を得る」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "AWS Budgets",
            "Reserved Instances",
            "Savings Plans",
            "Cost Explorer"
        ],
        "answer": 2,
        "explanation": "要件の中心は「一定の利用コミットメントに対してコンピューティング料金の割引を得る」です。したがってSavings Plansを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "AWS Budgetsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Reserved Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Savings Plansは、一定の利用コミットメントに対してコンピューティング料金の割引を得るための選択肢です。",
            "Cost Explorerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Savings Plans",
            "AWS Budgets",
            "Reserved Instances",
            "Cost Explorer"
        ]
    },
    {
        "id": "q465",
        "category": "Cost Optimization",
        "difficulty": "やや難",
        "question": "設計レビューで「一定の利用コミットメントに対してコンピューティング料金の割引を得る」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Savings Plans",
            "Spot Instances",
            "Reserved Instances",
            "AWS Budgets"
        ],
        "answer": 0,
        "explanation": "要件の中心は「一定の利用コミットメントに対してコンピューティング料金の割引を得る」です。したがってSavings Plansを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Savings Plansは、一定の利用コミットメントに対してコンピューティング料金の割引を得るための選択肢です。",
            "Spot Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Reserved Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "AWS Budgetsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Savings Plans",
            "Spot Instances",
            "Reserved Instances",
            "AWS Budgets"
        ]
    },
    {
        "id": "q466",
        "category": "Cost Optimization",
        "difficulty": "標準",
        "question": "企業のAWS環境で「長期利用を前提に対象サービスの料金割引を得る」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "AWS Budgets",
            "Cost Explorer",
            "Reserved Instances",
            "Savings Plans"
        ],
        "answer": 2,
        "explanation": "要件の中心は「長期利用を前提に対象サービスの料金割引を得る」です。したがってReserved Instancesを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "AWS Budgetsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Cost Explorerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Reserved Instancesは、長期利用を前提に対象サービスの料金割引を得るための選択肢です。",
            "Savings Plansは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Reserved Instances",
            "AWS Budgets",
            "Cost Explorer",
            "Savings Plans"
        ]
    },
    {
        "id": "q467",
        "category": "Cost Optimization",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「長期利用を前提に対象サービスの料金割引を得る」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "AWS Budgets",
            "Reserved Instances",
            "Spot Instances",
            "Savings Plans"
        ],
        "answer": 1,
        "explanation": "要件の中心は「長期利用を前提に対象サービスの料金割引を得る」です。したがってReserved Instancesを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "AWS Budgetsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Reserved Instancesは、長期利用を前提に対象サービスの料金割引を得るための選択肢です。",
            "Spot Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Savings Plansは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Reserved Instances",
            "AWS Budgets",
            "Spot Instances",
            "Savings Plans"
        ]
    },
    {
        "id": "q468",
        "category": "Cost Optimization",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「長期利用を前提に対象サービスの料金割引を得る」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Spot Instances",
            "Savings Plans",
            "S3 Intelligent-Tiering",
            "Reserved Instances"
        ],
        "answer": 3,
        "explanation": "要件の中心は「長期利用を前提に対象サービスの料金割引を得る」です。したがってReserved Instancesを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Spot Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Savings Plansは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Intelligent-Tieringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Reserved Instancesは、長期利用を前提に対象サービスの料金割引を得るための選択肢です。"
        ],
        "services": [
            "Reserved Instances",
            "Spot Instances",
            "Savings Plans",
            "S3 Intelligent-Tiering"
        ]
    },
    {
        "id": "q469",
        "category": "Cost Optimization",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「長期利用を前提に対象サービスの料金割引を得る」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Spot Instances",
            "S3 Intelligent-Tiering",
            "S3 Glacier",
            "Reserved Instances"
        ],
        "answer": 3,
        "explanation": "要件の中心は「長期利用を前提に対象サービスの料金割引を得る」です。したがってReserved Instancesを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Spot Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Intelligent-Tieringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Glacierは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Reserved Instancesは、長期利用を前提に対象サービスの料金割引を得るための選択肢です。"
        ],
        "services": [
            "Reserved Instances",
            "Spot Instances",
            "S3 Intelligent-Tiering",
            "S3 Glacier"
        ]
    },
    {
        "id": "q470",
        "category": "Cost Optimization",
        "difficulty": "やや難",
        "question": "設計レビューで「長期利用を前提に対象サービスの料金割引を得る」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Reserved Instances",
            "S3 Intelligent-Tiering",
            "S3 Glacier",
            "Right Sizing"
        ],
        "answer": 0,
        "explanation": "要件の中心は「長期利用を前提に対象サービスの料金割引を得る」です。したがってReserved Instancesを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Reserved Instancesは、長期利用を前提に対象サービスの料金割引を得るための選択肢です。",
            "S3 Intelligent-Tieringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Glacierは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Right Sizingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Reserved Instances",
            "S3 Intelligent-Tiering",
            "S3 Glacier",
            "Right Sizing"
        ]
    },
    {
        "id": "q471",
        "category": "Cost Optimization",
        "difficulty": "標準",
        "question": "企業のAWS環境で「中断可能なワークロードを余剰EC2容量で低価格運用する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "S3 Glacier",
            "Reserved Instances",
            "Spot Instances",
            "S3 Intelligent-Tiering"
        ],
        "answer": 2,
        "explanation": "要件の中心は「中断可能なワークロードを余剰EC2容量で低価格運用する」です。したがってSpot Instancesを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Glacierは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Reserved Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Spot Instancesは、中断可能なワークロードを余剰EC2容量で低価格運用するための選択肢です。",
            "S3 Intelligent-Tieringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Spot Instances",
            "S3 Glacier",
            "Reserved Instances",
            "S3 Intelligent-Tiering"
        ]
    },
    {
        "id": "q472",
        "category": "Cost Optimization",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「中断可能なワークロードを余剰EC2容量で低価格運用する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "S3 Intelligent-Tiering",
            "S3 Glacier",
            "Right Sizing",
            "Spot Instances"
        ],
        "answer": 3,
        "explanation": "要件の中心は「中断可能なワークロードを余剰EC2容量で低価格運用する」です。したがってSpot Instancesを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Intelligent-Tieringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Glacierは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Right Sizingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Spot Instancesは、中断可能なワークロードを余剰EC2容量で低価格運用するための選択肢です。"
        ],
        "services": [
            "Spot Instances",
            "S3 Intelligent-Tiering",
            "S3 Glacier",
            "Right Sizing"
        ]
    },
    {
        "id": "q473",
        "category": "Cost Optimization",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「中断可能なワークロードを余剰EC2容量で低価格運用する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "S3 Glacier",
            "Spot Instances",
            "Auto Scaling",
            "Right Sizing"
        ],
        "answer": 1,
        "explanation": "要件の中心は「中断可能なワークロードを余剰EC2容量で低価格運用する」です。したがってSpot Instancesを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Glacierは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Spot Instancesは、中断可能なワークロードを余剰EC2容量で低価格運用するための選択肢です。",
            "Auto Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Right Sizingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Spot Instances",
            "S3 Glacier",
            "Auto Scaling",
            "Right Sizing"
        ]
    },
    {
        "id": "q474",
        "category": "Cost Optimization",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「中断可能なワークロードを余剰EC2容量で低価格運用する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Auto Scaling",
            "Right Sizing",
            "Serverless",
            "Spot Instances"
        ],
        "answer": 3,
        "explanation": "要件の中心は「中断可能なワークロードを余剰EC2容量で低価格運用する」です。したがってSpot Instancesを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Auto Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Right Sizingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Serverlessは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Spot Instancesは、中断可能なワークロードを余剰EC2容量で低価格運用するための選択肢です。"
        ],
        "services": [
            "Spot Instances",
            "Auto Scaling",
            "Right Sizing",
            "Serverless"
        ]
    },
    {
        "id": "q475",
        "category": "Cost Optimization",
        "difficulty": "やや難",
        "question": "設計レビューで「中断可能なワークロードを余剰EC2容量で低価格運用する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Cost Explorer",
            "Auto Scaling",
            "Serverless",
            "Spot Instances"
        ],
        "answer": 3,
        "explanation": "要件の中心は「中断可能なワークロードを余剰EC2容量で低価格運用する」です。したがってSpot Instancesを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Cost Explorerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Auto Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Serverlessは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Spot Instancesは、中断可能なワークロードを余剰EC2容量で低価格運用するための選択肢です。"
        ],
        "services": [
            "Spot Instances",
            "Cost Explorer",
            "Auto Scaling",
            "Serverless"
        ]
    },
    {
        "id": "q476",
        "category": "Cost Optimization",
        "difficulty": "標準",
        "question": "企業のAWS環境で「アクセスパターンが不明・変動するS3データを自動で適切な層へ移動する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "S3 Intelligent-Tiering",
            "Auto Scaling",
            "Right Sizing",
            "Serverless"
        ],
        "answer": 0,
        "explanation": "要件の中心は「アクセスパターンが不明・変動するS3データを自動で適切な層へ移動する」です。したがってS3 Intelligent-Tieringを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。S3 Intelligent-Tieringは、アクセスパターンが不明・変動するS3データを自動で適切な層へ移動するための選択肢です。",
            "Auto Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Right Sizingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Serverlessは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 Intelligent-Tiering",
            "Auto Scaling",
            "Right Sizing",
            "Serverless"
        ]
    },
    {
        "id": "q477",
        "category": "Cost Optimization",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「アクセスパターンが不明・変動するS3データを自動で適切な層へ移動する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Cost Explorer",
            "Serverless",
            "Auto Scaling",
            "S3 Intelligent-Tiering"
        ],
        "answer": 3,
        "explanation": "要件の中心は「アクセスパターンが不明・変動するS3データを自動で適切な層へ移動する」です。したがってS3 Intelligent-Tieringを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Cost Explorerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Serverlessは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Auto Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Intelligent-Tieringは、アクセスパターンが不明・変動するS3データを自動で適切な層へ移動するための選択肢です。"
        ],
        "services": [
            "S3 Intelligent-Tiering",
            "Cost Explorer",
            "Serverless",
            "Auto Scaling"
        ]
    },
    {
        "id": "q478",
        "category": "Cost Optimization",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「アクセスパターンが不明・変動するS3データを自動で適切な層へ移動する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Cost Explorer",
            "AWS Budgets",
            "Serverless",
            "S3 Intelligent-Tiering"
        ],
        "answer": 3,
        "explanation": "要件の中心は「アクセスパターンが不明・変動するS3データを自動で適切な層へ移動する」です。したがってS3 Intelligent-Tieringを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Cost Explorerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "AWS Budgetsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Serverlessは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Intelligent-Tieringは、アクセスパターンが不明・変動するS3データを自動で適切な層へ移動するための選択肢です。"
        ],
        "services": [
            "S3 Intelligent-Tiering",
            "Cost Explorer",
            "AWS Budgets",
            "Serverless"
        ]
    },
    {
        "id": "q479",
        "category": "Cost Optimization",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「アクセスパターンが不明・変動するS3データを自動で適切な層へ移動する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Savings Plans",
            "Cost Explorer",
            "AWS Budgets",
            "S3 Intelligent-Tiering"
        ],
        "answer": 3,
        "explanation": "要件の中心は「アクセスパターンが不明・変動するS3データを自動で適切な層へ移動する」です。したがってS3 Intelligent-Tieringを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Savings Plansは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Cost Explorerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "AWS Budgetsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Intelligent-Tieringは、アクセスパターンが不明・変動するS3データを自動で適切な層へ移動するための選択肢です。"
        ],
        "services": [
            "S3 Intelligent-Tiering",
            "Savings Plans",
            "Cost Explorer",
            "AWS Budgets"
        ]
    },
    {
        "id": "q480",
        "category": "Cost Optimization",
        "difficulty": "やや難",
        "question": "設計レビューで「アクセスパターンが不明・変動するS3データを自動で適切な層へ移動する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "AWS Budgets",
            "Reserved Instances",
            "S3 Intelligent-Tiering",
            "Savings Plans"
        ],
        "answer": 2,
        "explanation": "要件の中心は「アクセスパターンが不明・変動するS3データを自動で適切な層へ移動する」です。したがってS3 Intelligent-Tieringを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "AWS Budgetsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Reserved Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Intelligent-Tieringは、アクセスパターンが不明・変動するS3データを自動で適切な層へ移動するための選択肢です。",
            "Savings Plansは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 Intelligent-Tiering",
            "AWS Budgets",
            "Reserved Instances",
            "Savings Plans"
        ]
    },
    {
        "id": "q481",
        "category": "Cost Optimization",
        "difficulty": "標準",
        "question": "企業のAWS環境で「アクセス頻度が低い長期保存データのストレージコストを抑える」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Savings Plans",
            "Cost Explorer",
            "AWS Budgets",
            "S3 Glacier"
        ],
        "answer": 3,
        "explanation": "要件の中心は「アクセス頻度が低い長期保存データのストレージコストを抑える」です。したがってS3 Glacierを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Savings Plansは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Cost Explorerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "AWS Budgetsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Glacierは、アクセス頻度が低い長期保存データのストレージコストを抑えるための選択肢です。"
        ],
        "services": [
            "S3 Glacier",
            "Savings Plans",
            "Cost Explorer",
            "AWS Budgets"
        ]
    },
    {
        "id": "q482",
        "category": "Cost Optimization",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「アクセス頻度が低い長期保存データのストレージコストを抑える」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "AWS Budgets",
            "S3 Glacier",
            "Reserved Instances",
            "Savings Plans"
        ],
        "answer": 1,
        "explanation": "要件の中心は「アクセス頻度が低い長期保存データのストレージコストを抑える」です。したがってS3 Glacierを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "AWS Budgetsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Glacierは、アクセス頻度が低い長期保存データのストレージコストを抑えるための選択肢です。",
            "Reserved Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Savings Plansは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 Glacier",
            "AWS Budgets",
            "Reserved Instances",
            "Savings Plans"
        ]
    },
    {
        "id": "q483",
        "category": "Cost Optimization",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「アクセス頻度が低い長期保存データのストレージコストを抑える」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Savings Plans",
            "Spot Instances",
            "Reserved Instances",
            "S3 Glacier"
        ],
        "answer": 3,
        "explanation": "要件の中心は「アクセス頻度が低い長期保存データのストレージコストを抑える」です。したがってS3 Glacierを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Savings Plansは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Spot Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Reserved Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Glacierは、アクセス頻度が低い長期保存データのストレージコストを抑えるための選択肢です。"
        ],
        "services": [
            "S3 Glacier",
            "Savings Plans",
            "Spot Instances",
            "Reserved Instances"
        ]
    },
    {
        "id": "q484",
        "category": "Cost Optimization",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「アクセス頻度が低い長期保存データのストレージコストを抑える」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Spot Instances",
            "S3 Glacier",
            "S3 Intelligent-Tiering",
            "Reserved Instances"
        ],
        "answer": 1,
        "explanation": "要件の中心は「アクセス頻度が低い長期保存データのストレージコストを抑える」です。したがってS3 Glacierを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Spot Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。S3 Glacierは、アクセス頻度が低い長期保存データのストレージコストを抑えるための選択肢です。",
            "S3 Intelligent-Tieringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Reserved Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 Glacier",
            "Spot Instances",
            "S3 Intelligent-Tiering",
            "Reserved Instances"
        ]
    },
    {
        "id": "q485",
        "category": "Cost Optimization",
        "difficulty": "やや難",
        "question": "設計レビューで「アクセス頻度が低い長期保存データのストレージコストを抑える」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "S3 Glacier",
            "Spot Instances",
            "S3 Intelligent-Tiering",
            "Right Sizing"
        ],
        "answer": 0,
        "explanation": "要件の中心は「アクセス頻度が低い長期保存データのストレージコストを抑える」です。したがってS3 Glacierを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。S3 Glacierは、アクセス頻度が低い長期保存データのストレージコストを抑えるための選択肢です。",
            "Spot Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Intelligent-Tieringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Right Sizingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "S3 Glacier",
            "Spot Instances",
            "S3 Intelligent-Tiering",
            "Right Sizing"
        ]
    },
    {
        "id": "q486",
        "category": "Cost Optimization",
        "difficulty": "標準",
        "question": "企業のAWS環境で「実際の負荷に合わせて過剰なEC2などのリソースサイズを適正化する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "S3 Intelligent-Tiering",
            "Spot Instances",
            "Reserved Instances",
            "Right Sizing"
        ],
        "answer": 3,
        "explanation": "要件の中心は「実際の負荷に合わせて過剰なEC2などのリソースサイズを適正化する」です。したがってRight Sizingを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Intelligent-Tieringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Spot Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Reserved Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Right Sizingは、実際の負荷に合わせて過剰なEC2などのリソースサイズを適正化するための選択肢です。"
        ],
        "services": [
            "Right Sizing",
            "S3 Intelligent-Tiering",
            "Spot Instances",
            "Reserved Instances"
        ]
    },
    {
        "id": "q487",
        "category": "Cost Optimization",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「実際の負荷に合わせて過剰なEC2などのリソースサイズを適正化する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Right Sizing",
            "S3 Intelligent-Tiering",
            "Spot Instances",
            "S3 Glacier"
        ],
        "answer": 0,
        "explanation": "要件の中心は「実際の負荷に合わせて過剰なEC2などのリソースサイズを適正化する」です。したがってRight Sizingを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Right Sizingは、実際の負荷に合わせて過剰なEC2などのリソースサイズを適正化するための選択肢です。",
            "S3 Intelligent-Tieringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Spot Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Glacierは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Right Sizing",
            "S3 Intelligent-Tiering",
            "Spot Instances",
            "S3 Glacier"
        ]
    },
    {
        "id": "q488",
        "category": "Cost Optimization",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「実際の負荷に合わせて過剰なEC2などのリソースサイズを適正化する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Auto Scaling",
            "S3 Glacier",
            "Right Sizing",
            "S3 Intelligent-Tiering"
        ],
        "answer": 2,
        "explanation": "要件の中心は「実際の負荷に合わせて過剰なEC2などのリソースサイズを適正化する」です。したがってRight Sizingを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Auto Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Glacierは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Right Sizingは、実際の負荷に合わせて過剰なEC2などのリソースサイズを適正化するための選択肢です。",
            "S3 Intelligent-Tieringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Right Sizing",
            "Auto Scaling",
            "S3 Glacier",
            "S3 Intelligent-Tiering"
        ]
    },
    {
        "id": "q489",
        "category": "Cost Optimization",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「実際の負荷に合わせて過剰なEC2などのリソースサイズを適正化する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Auto Scaling",
            "Serverless",
            "Right Sizing",
            "S3 Glacier"
        ],
        "answer": 2,
        "explanation": "要件の中心は「実際の負荷に合わせて過剰なEC2などのリソースサイズを適正化する」です。したがってRight Sizingを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Auto Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Serverlessは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Right Sizingは、実際の負荷に合わせて過剰なEC2などのリソースサイズを適正化するための選択肢です。",
            "S3 Glacierは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Right Sizing",
            "Auto Scaling",
            "Serverless",
            "S3 Glacier"
        ]
    },
    {
        "id": "q490",
        "category": "Cost Optimization",
        "difficulty": "やや難",
        "question": "設計レビューで「実際の負荷に合わせて過剰なEC2などのリソースサイズを適正化する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Auto Scaling",
            "Cost Explorer",
            "Serverless",
            "Right Sizing"
        ],
        "answer": 3,
        "explanation": "要件の中心は「実際の負荷に合わせて過剰なEC2などのリソースサイズを適正化する」です。したがってRight Sizingを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Auto Scalingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Cost Explorerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Serverlessは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Right Sizingは、実際の負荷に合わせて過剰なEC2などのリソースサイズを適正化するための選択肢です。"
        ],
        "services": [
            "Right Sizing",
            "Auto Scaling",
            "Cost Explorer",
            "Serverless"
        ]
    },
    {
        "id": "q491",
        "category": "Cost Optimization",
        "difficulty": "標準",
        "question": "企業のAWS環境で「需要に応じてリソース量を増減させアイドル容量のコストを減らす」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Serverless",
            "Auto Scaling",
            "Right Sizing",
            "S3 Glacier"
        ],
        "answer": 1,
        "explanation": "要件の中心は「需要に応じてリソース量を増減させアイドル容量のコストを減らす」です。したがってAuto Scalingを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Serverlessは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Auto Scalingは、需要に応じてリソース量を増減させアイドル容量のコストを減らすための選択肢です。",
            "Right Sizingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Glacierは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Auto Scaling",
            "Serverless",
            "Right Sizing",
            "S3 Glacier"
        ]
    },
    {
        "id": "q492",
        "category": "Cost Optimization",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「需要に応じてリソース量を増減させアイドル容量のコストを減らす」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Auto Scaling",
            "Serverless",
            "Right Sizing",
            "Cost Explorer"
        ],
        "answer": 0,
        "explanation": "要件の中心は「需要に応じてリソース量を増減させアイドル容量のコストを減らす」です。したがってAuto Scalingを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Auto Scalingは、需要に応じてリソース量を増減させアイドル容量のコストを減らすための選択肢です。",
            "Serverlessは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Right Sizingは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Cost Explorerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Auto Scaling",
            "Serverless",
            "Right Sizing",
            "Cost Explorer"
        ]
    },
    {
        "id": "q493",
        "category": "Cost Optimization",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「需要に応じてリソース量を増減させアイドル容量のコストを減らす」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "AWS Budgets",
            "Serverless",
            "Cost Explorer",
            "Auto Scaling"
        ],
        "answer": 3,
        "explanation": "要件の中心は「需要に応じてリソース量を増減させアイドル容量のコストを減らす」です。したがってAuto Scalingを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "AWS Budgetsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Serverlessは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Cost Explorerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Auto Scalingは、需要に応じてリソース量を増減させアイドル容量のコストを減らすための選択肢です。"
        ],
        "services": [
            "Auto Scaling",
            "AWS Budgets",
            "Serverless",
            "Cost Explorer"
        ]
    },
    {
        "id": "q494",
        "category": "Cost Optimization",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「需要に応じてリソース量を増減させアイドル容量のコストを減らす」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "Auto Scaling",
            "Savings Plans",
            "AWS Budgets",
            "Cost Explorer"
        ],
        "answer": 0,
        "explanation": "要件の中心は「需要に応じてリソース量を増減させアイドル容量のコストを減らす」です。したがってAuto Scalingを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Auto Scalingは、需要に応じてリソース量を増減させアイドル容量のコストを減らすための選択肢です。",
            "Savings Plansは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "AWS Budgetsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Cost Explorerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Auto Scaling",
            "Savings Plans",
            "AWS Budgets",
            "Cost Explorer"
        ]
    },
    {
        "id": "q495",
        "category": "Cost Optimization",
        "difficulty": "やや難",
        "question": "設計レビューで「需要に応じてリソース量を増減させアイドル容量のコストを減らす」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Reserved Instances",
            "Auto Scaling",
            "AWS Budgets",
            "Savings Plans"
        ],
        "answer": 1,
        "explanation": "要件の中心は「需要に応じてリソース量を増減させアイドル容量のコストを減らす」です。したがってAuto Scalingを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Reserved Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Auto Scalingは、需要に応じてリソース量を増減させアイドル容量のコストを減らすための選択肢です。",
            "AWS Budgetsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Savings Plansは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Auto Scaling",
            "Reserved Instances",
            "AWS Budgets",
            "Savings Plans"
        ]
    },
    {
        "id": "q496",
        "category": "Cost Optimization",
        "difficulty": "標準",
        "question": "企業のAWS環境で「常時稼働サーバーを避け、実行量に応じて課金されるサービスを選択する」という要件があります。 次の要件を満たすAWSサービスとして最も適切なものはどれですか？",
        "choices": [
            "Cost Explorer",
            "AWS Budgets",
            "Serverless",
            "Savings Plans"
        ],
        "answer": 2,
        "explanation": "要件の中心は「常時稼働サーバーを避け、実行量に応じて課金されるサービスを選択する」です。したがってServerlessを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Cost Explorerは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "AWS Budgetsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Serverlessは、常時稼働サーバーを避け、実行量に応じて課金されるサービスを選択するための選択肢です。",
            "Savings Plansは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Serverless",
            "Cost Explorer",
            "AWS Budgets",
            "Savings Plans"
        ]
    },
    {
        "id": "q497",
        "category": "Cost Optimization",
        "difficulty": "やや難",
        "question": "あるアプリケーションでは「常時稼働サーバーを避け、実行量に応じて課金されるサービスを選択する」が必要です。 AWSでこの構成を設計するとき、第一候補として選ぶべきものはどれですか？",
        "choices": [
            "Savings Plans",
            "Serverless",
            "Reserved Instances",
            "AWS Budgets"
        ],
        "answer": 1,
        "explanation": "要件の中心は「常時稼働サーバーを避け、実行量に応じて課金されるサービスを選択する」です。したがってServerlessを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Savings Plansは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Serverlessは、常時稼働サーバーを避け、実行量に応じて課金されるサービスを選択するための選択肢です。",
            "Reserved Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "AWS Budgetsは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Serverless",
            "Savings Plans",
            "Reserved Instances",
            "AWS Budgets"
        ]
    },
    {
        "id": "q498",
        "category": "Cost Optimization",
        "difficulty": "標準",
        "question": "クラウド移行プロジェクトで「常時稼働サーバーを避け、実行量に応じて課金されるサービスを選択する」を実現することになりました。 運用担当者がこの要件を実現したい場合、最も適切な選択肢はどれですか？",
        "choices": [
            "Spot Instances",
            "Serverless",
            "Reserved Instances",
            "Savings Plans"
        ],
        "answer": 1,
        "explanation": "要件の中心は「常時稼働サーバーを避け、実行量に応じて課金されるサービスを選択する」です。したがってServerlessを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "Spot Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Serverlessは、常時稼働サーバーを避け、実行量に応じて課金されるサービスを選択するための選択肢です。",
            "Reserved Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Savings Plansは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Serverless",
            "Spot Instances",
            "Reserved Instances",
            "Savings Plans"
        ]
    },
    {
        "id": "q499",
        "category": "Cost Optimization",
        "difficulty": "やや難",
        "question": "本番環境のアーキテクチャで「常時稼働サーバーを避け、実行量に応じて課金されるサービスを選択する」を満たす必要があります。 可用性・セキュリティ・運用性を考慮したSAA向けの設計として、最も適切なものはどれですか？",
        "choices": [
            "S3 Intelligent-Tiering",
            "Serverless",
            "Reserved Instances",
            "Spot Instances"
        ],
        "answer": 1,
        "explanation": "要件の中心は「常時稼働サーバーを避け、実行量に応じて課金されるサービスを選択する」です。したがってServerlessを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "S3 Intelligent-Tieringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "正解です。Serverlessは、常時稼働サーバーを避け、実行量に応じて課金されるサービスを選択するための選択肢です。",
            "Reserved Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "Spot Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Serverless",
            "S3 Intelligent-Tiering",
            "Reserved Instances",
            "Spot Instances"
        ]
    },
    {
        "id": "q500",
        "category": "Cost Optimization",
        "difficulty": "やや難",
        "question": "設計レビューで「常時稼働サーバーを避け、実行量に応じて課金されるサービスを選択する」という条件が提示されました。 コストと要件のバランスを考えた場合、要件を直接満たす選択肢はどれですか？",
        "choices": [
            "Serverless",
            "Spot Instances",
            "S3 Intelligent-Tiering",
            "S3 Glacier"
        ],
        "answer": 0,
        "explanation": "要件の中心は「常時稼働サーバーを避け、実行量に応じて課金されるサービスを選択する」です。したがってServerlessを選択します。SAAでは、要件からサービスの責務を逆引きすることが重要です。",
        "choiceExplanations": [
            "正解です。Serverlessは、常時稼働サーバーを避け、実行量に応じて課金されるサービスを選択するための選択肢です。",
            "Spot Instancesは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Intelligent-Tieringは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。",
            "S3 Glacierは別の用途を持つため、この問題の要件を直接満たす第一選択ではありません。"
        ],
        "services": [
            "Serverless",
            "Spot Instances",
            "S3 Intelligent-Tiering",
            "S3 Glacier"
        ]
    }
];

// =========================================================
// UTILITY
// =========================================================
function $(id) { return document.getElementById(id); }
function calculateAccuracy(correct,total) { return total ? Math.round(correct/total*100) : 0; }
function getTodayStart() { const d=new Date(); d.setHours(0,0,0,0); return d; }
function getWeekStart() { const d=new Date(); const day=d.getDay(); d.setDate(d.getDate()+(day===0?-6:1-day)); d.setHours(0,0,0,0); return d; }
function formatDate(date) { if(!date) return ""; const d=date instanceof Date?date:date.toDate(); return d.toLocaleDateString("ja-JP"); }
function getQuestionById(id) { return questionDatabase.find(q=>q.id===id); }

// =========================================================
// FIRESTORE REFERENCES / DATA
// =========================================================
function getProgressRef(){return doc(db,"users",currentUser.uid,"aws","progress");}
function getHistoryCollection(){return collection(db,"users",currentUser.uid,"awsHistory");}
function getFavoritesCollection(){return collection(db,"users",currentUser.uid,"awsFavorites");}
function getMockResultsCollection(){return collection(db,"users",currentUser.uid,"awsMockResults");}

async function loadAwsData(){
    if(!currentUser)return;
    try{const s=await getDoc(getProgressRef()); if(s.exists()) awsData={...awsData,...s.data()}; applyAwsDataToUI();}
    catch(e){console.error("AWS data load error:",e);}
}
async function saveAwsData(){
    if(!currentUser)return;
    try{await setDoc(getProgressRef(),awsData,{merge:true});}
    catch(e){console.error("AWS data save error:",e);}
}
function applyAwsDataToUI(){
    if($("aws-progress-value"))$("aws-progress-value").textContent=`${awsData.progress}%`;
    if($("aws-progress-text"))$("aws-progress-text").textContent=`${awsData.progress}%`;
    if($("aws-progress-bar"))$("aws-progress-bar").style.width=`${awsData.progress}%`;
    if($("aws-accuracy-value"))$("aws-accuracy-value").textContent=`${awsData.accuracy}%`;
    if($("aws-question-count"))$("aws-question-count").textContent=awsData.questionCount;
    if($("aws-target-date"))$("aws-target-date").value=awsData.targetDate||"";
    if($("aws-progress-input"))$("aws-progress-input").value=awsData.progress;
    if($("aws-target-questions-input"))$("aws-target-questions-input").value=awsData.targetQuestions;
    if($("aws-daily-target-input"))$("aws-daily-target-input").value=awsData.dailyTarget;
    if($("aws-note"))$("aws-note").value=awsData.note||"";
    updateGoalUI();
}
async function saveSettings(){
    const progress=Number($("aws-progress-input").value), targetQuestions=Number($("aws-target-questions-input").value), dailyTarget=Number($("aws-daily-target-input").value), targetDate=$("aws-target-date").value, note=$("aws-note").value;
    if(progress<0||progress>100){alert("進捗率は0〜100の範囲で入力してください。");return;}
    awsData.progress=progress; awsData.targetQuestions=targetQuestions||1000; awsData.dailyTarget=dailyTarget||10; awsData.targetDate=targetDate; awsData.note=note;
    await saveAwsData(); applyAwsDataToUI();
    if($("aws-save-status")){ $("aws-save-status").textContent="保存しました。"; setTimeout(()=>$("aws-save-status").textContent="",3000); }
}

async function loadHistory(){
    if(!currentUser)return;
    try{
        const snapshot=await getDocs(getHistoryCollection());
        questionHistory=snapshot.docs.map(d=>({id:d.id,...d.data()}));
        questionHistory.sort((a,b)=>((b.answeredAt?.toDate?b.answeredAt.toDate():new Date(0))-(a.answeredAt?.toDate?a.answeredAt.toDate():new Date(0))));
        rebuildWrongQuestions(); updateAnalytics();
    }catch(e){console.error("History load error:",e);}
}
async function loadFavorites(){
    if(!currentUser)return;
    try{const snapshot=await getDocs(getFavoritesCollection()); favoriteQuestionIds=new Set(snapshot.docs.map(d=>d.id)); updateFavoriteButton();}
    catch(e){console.error("Favorites load error:",e);}
}
async function saveAnswerHistory(question,selectedIndex,isCorrect){
    if(!currentUser)return;
    try{await addDoc(getHistoryCollection(),{questionId:question.id,category:question.category,difficulty:question.difficulty,selectedIndex,correctIndex:question.answer,isCorrect,answeredAt:Timestamp.now()});}
    catch(e){console.error("Answer history save error:",e);}
}

async function toggleFavorite(){
    if(!currentQuestion)return;
    if(!currentUser){alert("ログインしてください。");return;}
    const ref=doc(getFavoritesCollection(),currentQuestion.id);
    try{
        if(favoriteQuestionIds.has(currentQuestion.id)){await deleteDoc(ref);favoriteQuestionIds.delete(currentQuestion.id);}
        else{await setDoc(ref,{questionId:currentQuestion.id,createdAt:Timestamp.now()});favoriteQuestionIds.add(currentQuestion.id);}
        updateFavoriteButton();
    }catch(e){console.error("Favorite error:",e);}
}
function updateFavoriteButton(){
    if(!$("favorite-button"))return;
    if(!currentQuestion){$("favorite-button").textContent="☆ お気に入り";return;}
    $("favorite-button").textContent=favoriteQuestionIds.has(currentQuestion.id)?"★ お気に入り":"☆ お気に入り";
}
function rebuildWrongQuestions(){
    const latest=new Map(); wrongQuestionCounts={};
    questionHistory.forEach(item=>{
        if(!item.questionId)return;
        latest.set(item.questionId,item);
        if(!item.isCorrect) wrongQuestionCounts[item.questionId]=(wrongQuestionCounts[item.questionId]||0)+1;
    });
    wrongQuestionIds=new Set(); latest.forEach((item,id)=>{if(!item.isCorrect)wrongQuestionIds.add(id);});
}

// =========================================================
// STUDY FILTERS / QUESTION RENDERING
// =========================================================
function getFilteredQuestions(){
    let pool=[...questionDatabase];
    if(currentCategory!=="all")pool=pool.filter(q=>q.category===currentCategory);
    if(currentFilter==="weak"){
        const weak=new Set(); categories.forEach(cat=>{const items=questionHistory.filter(i=>i.category===cat);if(items.length<3)return;const acc=calculateAccuracy(items.filter(i=>i.isCorrect).length,items.length);if(acc<60)weak.add(cat);});
        pool=pool.filter(q=>weak.has(q.category));
    }
    if(currentFilter==="wrong")pool=pool.filter(q=>wrongQuestionIds.has(q.id));
    return pool;
}
function getPriorityWrongQuestions(){return [...questionDatabase].filter(q=>wrongQuestionIds.has(q.id)).sort((a,b)=>(wrongQuestionCounts[b.id]||0)-(wrongQuestionCounts[a.id]||0));}

// =========================================================
// FAVORITE STUDY
// =========================================================
function getFavoriteQuestions(){
    return [...questionDatabase].filter(q=>favoriteQuestionIds.has(q.id));
}

function startFavoriteStudy(){
    stopMockExam();

    if(!currentUser){
        alert("ログインしてください。");
        return;
    }

    const favorites=getFavoriteQuestions();

    if(!favorites.length){
        alert(
            "お気に入り登録されている問題がありません。\n\n" +
            "問題を解いたあと「☆ お気に入り」を押すと登録できます。"
        );
        return;
    }

    studyMode="favorite";
    currentFilter="favorite";
    currentCategory="all";
    currentStudyQuestions=[...favorites];
    currentStudyIndex=0;
    previousQuestionId=null;

    renderFavoriteQuestion();

    if($("study-section"))$("study-section").scrollIntoView({behavior:"smooth"});
}

function renderFavoriteQuestion(){
    if(!currentStudyQuestions.length){
        finishFavoriteStudy();
        return;
    }

    if(currentStudyIndex>=currentStudyQuestions.length){
        finishFavoriteStudy();
        return;
    }

    currentQuestion=currentStudyQuestions[currentStudyIndex];
    previousQuestionId=currentQuestion.id;

    if($("question-number")){
        $("question-number").textContent=
            `FAVORITE ${currentStudyIndex+1} / ${currentStudyQuestions.length}`;
    }

    if($("question-tags")){
        $("question-tags").innerHTML=
            `<span>${currentQuestion.category}</span><span>${currentQuestion.difficulty}</span><span>⭐ お気に入り</span>`;
    }

    if($("question-text"))$("question-text").textContent=currentQuestion.question;

    const answerList=$("answer-list");
    if(!answerList)return;

    answerList.innerHTML="";

    currentQuestion.choices.forEach((choice,index)=>{
        const button=document.createElement("button");
        button.className="answer-button";
        button.textContent=`${String.fromCharCode(65+index)}. ${choice}`;
        button.addEventListener("click",()=>answerQuestion(index));
        answerList.appendChild(button);
    });

    if($("question-result")){
        $("question-result").innerHTML="";
        $("question-result").style.display="none";
    }

    if($("next-question-button"))$("next-question-button").style.display="none";

    updateFavoriteButton();
}

function finishFavoriteStudy(){
    const total=currentStudyQuestions.length;

    if($("question-number"))
        $("question-number").textContent="FAVORITE COMPLETE";

    if($("question-text"))
        $("question-text").textContent=
            `⭐ お気に入り問題 ${total}問の演習が完了しました！`;

    if($("answer-list"))$("answer-list").innerHTML="";
    if($("question-result")){
        $("question-result").innerHTML=
            `<div class="result-title">🎉 お疲れさまでした！</div>` +
            `<div class="result-explanation">お気に入り登録した ${total} 問をすべて演習しました。</div>`;
        $("question-result").style.display="block";
    }
    if($("next-question-button"))$("next-question-button").style.display="none";
}

function getRandomQuestion(pool){
    if(!pool.length)return null;
    let candidates=pool;
    if(pool.length>1&&previousQuestionId){const filtered=pool.filter(q=>q.id!==previousQuestionId);if(filtered.length)candidates=filtered;}
    const q=candidates[Math.floor(Math.random()*candidates.length)]; previousQuestionId=q.id; return q;
}
function startStudy(mode="normal",category="all"){
    stopMockExam(); studyMode=mode; currentFilter=mode==="normal"?"all":mode; currentCategory=category;
    if(mode==="wrong"){const priority=getPriorityWrongQuestions();currentStudyQuestions=priority.length?priority:getFilteredQuestions();}
    else currentStudyQuestions=getFilteredQuestions();
    currentStudyIndex=0;
    if(!currentStudyQuestions.length){alert("対象となる問題がありません。");return;}
    renderQuestion(); if($("study-section"))$("study-section").scrollIntoView({behavior:"smooth"});
}
function renderQuestion(){
    const pool=currentStudyQuestions.length?currentStudyQuestions:questionDatabase; currentQuestion=getRandomQuestion(pool); if(!currentQuestion)return;
    if($("question-number"))$("question-number").textContent=`QUESTION ${awsData.questionCount+1}`;
    if($("question-tags"))$("question-tags").innerHTML=`<span>${currentQuestion.category}</span><span>${currentQuestion.difficulty}</span>`;
    if($("question-text"))$("question-text").textContent=currentQuestion.question;
    const answerList=$("answer-list"); if(!answerList)return; answerList.innerHTML="";
    currentQuestion.choices.forEach((choice,index)=>{const button=document.createElement("button");button.className="answer-button";button.textContent=`${String.fromCharCode(65+index)}. ${choice}`;button.addEventListener("click",()=>answerQuestion(index));answerList.appendChild(button);});
    if($("question-result")){ $("question-result").innerHTML="";$("question-result").style.display="none"; }
    if($("next-question-button"))$("next-question-button").style.display="none";
    updateFavoriteButton();
}
function getServiceExplanationHTML(question){
    const names=[...(question.services||question.choices||[])];
    const unique=[...new Set(names)].filter(Boolean);
    return `<div class="service-explanation"><strong>🧩 登場サービスの簡単な説明</strong>${unique.map(name=>`<div><strong>${escapeHTML(name)}</strong>：${escapeHTML(SERVICE_INFO[name]||"このサービス・機能はAWSのアーキテクチャ上の特定の責務を担います。")}</div>`).join("")}</div>`;
}
function escapeHTML(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function answerQuestion(selectedIndex){
    if(!currentQuestion)return;
    const buttons=document.querySelectorAll(".answer-button"); buttons.forEach(b=>b.disabled=true);
    const correctIndex=currentQuestion.answer, isCorrect=selectedIndex===correctIndex;
    buttons.forEach((button,index)=>{if(index===correctIndex)button.classList.add("correct");if(index===selectedIndex&&!isCorrect)button.classList.add("incorrect");});
    if(isCorrect)awsData.correctCount++; else {awsData.incorrectCount++;wrongQuestionIds.add(currentQuestion.id);wrongQuestionCounts[currentQuestion.id]=(wrongQuestionCounts[currentQuestion.id]||0)+1;}
    awsData.questionCount++; awsData.accuracy=calculateAccuracy(awsData.correctCount,awsData.questionCount);
    await saveAnswerHistory(currentQuestion,selectedIndex,isCorrect); await saveAwsData(); applyAwsDataToUI();
    const result=$("question-result");
    if(result){
        result.style.display="block";
        result.innerHTML=`<div class="result-title">${isCorrect?"🎉 正解！":"❌ 不正解"}</div><div class="result-explanation"><strong>あなたの回答：</strong>${escapeHTML(currentQuestion.choiceExplanations[selectedIndex]||"")}</div><div class="result-explanation"><strong>解説：</strong><br>${escapeHTML(currentQuestion.explanation)}</div>${getServiceExplanationHTML(currentQuestion)}`;
    }
    if($("next-question-button"))$("next-question-button").style.display="block";
    updateAnalytics();
}
function nextQuestion(){
    if(studyMode==="favorite"){
        currentStudyIndex++;
        renderFavoriteQuestion();
        return;
    }

    if(studyMode==="wrong")currentStudyQuestions=getPriorityWrongQuestions();
    if(!currentStudyQuestions.length){
        alert("現在、対象となる問題はありません。");
        return;
    }
    currentStudyIndex++;
    renderQuestion();
}

// =========================================================
// CATEGORY / FILTER UI
// =========================================================
function createCategoryButtons(){
    const container=$("category-buttons");if(!container)return;container.innerHTML="";
    const all=document.createElement("button");all.className="filter-button active";all.textContent="すべて";all.dataset.category="all";all.addEventListener("click",()=>selectCategory("all",all));container.appendChild(all);
    categories.forEach(category=>{const button=document.createElement("button");button.className="filter-button";button.textContent=category;button.dataset.category=category;button.addEventListener("click",()=>selectCategory(category,button));container.appendChild(button);});
}
function selectCategory(category,button){currentCategory=category;document.querySelectorAll("#category-buttons .filter-button").forEach(item=>item.classList.remove("active"));button.classList.add("active");startStudy("normal",category);}
function setupFilters(){
    document.querySelectorAll(".filter-button").forEach(button=>button.addEventListener("click",()=>{if(button.dataset.category)return;document.querySelectorAll(".filter-button").forEach(item=>item.classList.remove("active"));button.classList.add("active");currentFilter=button.dataset.filter||"all";currentStudyQuestions=getFilteredQuestions();currentStudyIndex=0;if(currentStudyQuestions.length)renderQuestion();else alert("対象となる問題がありません。");}));
}

// =========================================================
// ANALYTICS
// =========================================================
function updateAnalytics(){updateDailyStatistics();updateWeeklyStatistics();updateCategoryPerformance();updateWeakAreas();updateStreak();updateGoalUI();}
function updateDailyStatistics(){const start=getTodayStart();const h=questionHistory.filter(i=>i.answeredAt?.toDate&&i.answeredAt.toDate()>=start);const correct=h.filter(i=>i.isCorrect).length;if($("today-question-count"))$("today-question-count").textContent=h.length;if($("today-accuracy"))$("today-accuracy").textContent=`${calculateAccuracy(correct,h.length)}%`;}
function updateWeeklyStatistics(){const start=getWeekStart();const h=questionHistory.filter(i=>i.answeredAt?.toDate&&i.answeredAt.toDate()>=start);const correct=h.filter(i=>i.isCorrect).length;if($("week-question-count"))$("week-question-count").textContent=h.length;if($("week-accuracy"))$("week-accuracy").textContent=`${calculateAccuracy(correct,h.length)}%`;}
function updateCategoryPerformance(){const container=$("category-performance");if(!container)return;container.innerHTML="";categories.forEach(category=>{const items=questionHistory.filter(i=>i.category===category);const correct=items.filter(i=>i.isCorrect).length;const row=document.createElement("div");row.className="category-performance-row";row.innerHTML=`<div class="category-name">${category}</div><div class="category-count">${items.length}問</div><div class="category-accuracy">${calculateAccuracy(correct,items.length)}%</div>`;container.appendChild(row);});}
function updateWeakAreas(){const container=$("weak-areas");if(!container)return;container.innerHTML="";const weak=[];categories.forEach(category=>{const items=questionHistory.filter(i=>i.category===category);if(items.length<3)return;const acc=calculateAccuracy(items.filter(i=>i.isCorrect).length,items.length);if(acc<60)weak.push({category,accuracy:acc,count:items.length});});if(!weak.length){container.innerHTML="<p>現在、明確な弱点はありません。</p>";return;}weak.sort((a,b)=>a.accuracy-b.accuracy).forEach(item=>{const e=document.createElement("div");e.className="weak-area-item";e.textContent=`${item.category}：${item.accuracy}%`;container.appendChild(e);});}
function updateStreak(){
    const dates=new Set();questionHistory.forEach(item=>{if(!item.answeredAt?.toDate)return;const d=item.answeredAt.toDate();dates.add(d.toISOString().slice(0,10));});
    let streak=0,current=new Date();current.setHours(0,0,0,0);while(dates.has(current.toISOString().slice(0,10))){streak++;current.setDate(current.getDate()-1);}if($("streak-count"))$("streak-count").textContent=streak;
    const calendar=$("streak-calendar");if(calendar){calendar.innerHTML="";for(let i=27;i>=0;i--){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-i);const day=document.createElement("div");day.className=dates.has(d.toISOString().slice(0,10))?"streak-day active":"streak-day";day.title=formatDate(d);calendar.appendChild(day);}}
    if($("longest-streak"))$("longest-streak").textContent=calculateLongestStreak(dates);
}
function calculateLongestStreak(dates){if(!dates.size)return 0;const sorted=[...dates].sort();let longest=1,current=1;for(let i=1;i<sorted.length;i++){const diff=(new Date(sorted[i])-new Date(sorted[i-1]))/(1000*60*60*24);if(diff===1){current++;longest=Math.max(longest,current);}else current=1;}return longest;}
function updateGoalUI(){
    if($("goal-target-date"))$("goal-target-date").textContent=awsData.targetDate||"未設定";
    if($("goal-target-questions"))$("goal-target-questions").textContent=Math.max(awsData.targetQuestions-awsData.questionCount,0);
    if($("goal-today-target"))$("goal-today-target").textContent=awsData.dailyTarget;
    if($("goal-days-left")){if(!awsData.targetDate)$("goal-days-left").textContent="—";else{const target=new Date(`${awsData.targetDate}T23:59:59`);$("goal-days-left").textContent=Math.max(Math.ceil((target-new Date())/(1000*60*60*24)),0);}}
}

// =========================================================
// MOCK EXAM — 65 QUESTIONS / 120 MINUTES
// =========================================================
function createMockQuestions(){
    const shuffled=[...questionDatabase].sort(()=>Math.random()-0.5);const result=[];while(result.length<MOCK_TOTAL)result.push(shuffled[result.length%shuffled.length]);return result;
}
function startMockExam(){currentStudyQuestions=[];mockQuestions=createMockQuestions();mockAnswers=new Array(mockQuestions.length).fill(null);mockMarked=new Array(mockQuestions.length).fill(false);mockCurrentIndex=0;mockStartedAt=new Date();renderMockQuestion();startMockTimer();if($("study-section"))$("study-section").scrollIntoView({behavior:"smooth"});}
function renderMockQuestion(){
    const question=mockQuestions[mockCurrentIndex];if(!question)return;currentQuestion=question;
    if($("question-number"))$("question-number").textContent=`MOCK ${mockCurrentIndex+1} / ${mockQuestions.length}`;
    if($("question-tags"))$("question-tags").innerHTML=`<span>${question.category}</span><span>${question.difficulty}</span>`;
    if($("question-text"))$("question-text").textContent=question.question;
    const answerList=$("answer-list");if(!answerList)return;answerList.innerHTML="";
    question.choices.forEach((choice,index)=>{const button=document.createElement("button");button.className="answer-button";button.textContent=`${String.fromCharCode(65+index)}. ${choice}`;if(mockAnswers[mockCurrentIndex]===index)button.classList.add("selected");button.addEventListener("click",()=>{mockAnswers[mockCurrentIndex]=index;renderMockQuestion();});answerList.appendChild(button);});
    updateMockNavigation();updateMockMarkButton();
}
function updateMockNavigation(){const existing=$("mock-navigation");if(!existing)return;existing.innerHTML="";mockQuestions.forEach((question,index)=>{const b=document.createElement("button");b.textContent=index+1;b.className="mock-number-button";if(index===mockCurrentIndex)b.classList.add("active");if(mockAnswers[index]!==null)b.classList.add("answered");if(mockMarked[index])b.classList.add("marked");b.addEventListener("click",()=>{mockCurrentIndex=index;renderMockQuestion();});existing.appendChild(b);});}
function updateMockMarkButton(){const b=$("mock-mark-button");if(b)b.textContent=mockMarked[mockCurrentIndex]?"★ 見直し":"☆ 見直し";}
function mockNext(){if(mockCurrentIndex<mockQuestions.length-1){mockCurrentIndex++;renderMockQuestion();}}
function mockPrevious(){if(mockCurrentIndex>0){mockCurrentIndex--;renderMockQuestion();}}
function toggleMockMark(){if(!mockQuestions.length)return;mockMarked[mockCurrentIndex]=!mockMarked[mockCurrentIndex];renderMockQuestion();}
function startMockTimer(){stopMockTimer();const endTime=Date.now()+MOCK_TIME_SECONDS*1000;mockTimerInterval=setInterval(()=>{const remaining=Math.max(0,Math.floor((endTime-Date.now())/1000));updateMockTimer(remaining);if(remaining<=0)finishMockExam();},1000);}
function updateMockTimer(seconds){const minutes=Math.floor(seconds/60),remainingSeconds=seconds%60,text=`${String(minutes).padStart(2,"0")}:${String(remainingSeconds).padStart(2,"0")}`;const timer=document.querySelector(".mock-timer");if(timer)timer.textContent=text;}
function stopMockTimer(){if(mockTimerInterval){clearInterval(mockTimerInterval);mockTimerInterval=null;}}
function stopMockExam(){stopMockTimer();mockQuestions=[];mockAnswers=[];mockMarked=[];mockCurrentIndex=0;}
async function finishMockExam(){
    if(!mockQuestions.length)return;stopMockTimer();let correct=0;const categoryResults={};mockQuestions.forEach((question,index)=>{if(!categoryResults[question.category])categoryResults[question.category]={correct:0,total:0};categoryResults[question.category].total++;if(mockAnswers[index]===question.answer){correct++;categoryResults[question.category].correct++;}});
    const total=mockQuestions.length,score=Math.round(correct/total*100),elapsedSeconds=mockStartedAt?Math.floor((Date.now()-mockStartedAt.getTime())/1000):0,estimate=score>=80?"合格圏":score>=70?"やや合格圏":score>=60?"要対策":"要強化";
    if(currentUser){try{await addDoc(getMockResultsCollection(),{correct,total,score,elapsedSeconds,estimate,categoryResults,markedCount:mockMarked.filter(Boolean).length,completedAt:Timestamp.now()});}catch(e){console.error("Mock result save error:",e);}}
    if($("mock-result-score"))$("mock-result-score").textContent=`${score}%`;if($("mock-result-correct"))$("mock-result-correct").textContent=`${correct} / ${total}`;if($("mock-result-total"))$("mock-result-total").textContent=total;
    if($("mock-result-time")){const m=Math.floor(elapsedSeconds/60),s=elapsedSeconds%60;$("mock-result-time").textContent=`${m}分${s}秒`;}
    if($("mock-result-estimate"))$("mock-result-estimate").textContent=estimate;if($("mock-result-modal"))$("mock-result-modal").style.display="flex";
}

// =========================================================
// AUTH / EVENTS / INIT
// =========================================================
function setupAuth(){onAuthStateChangedAuth(auth,async user=>{currentUser=user;const status=$("auth-status");if(user){if(status)status.textContent=user.email||"ログイン中";await loadAwsData();await loadHistory();await loadFavorites();rebuildWrongQuestions();updateAnalytics();}else{if(status)status.textContent="未ログイン";}});}
function setupEventListeners(){
    if($("aws-save-button"))$("aws-save-button").addEventListener("click",saveSettings);
    if($("favorite-button"))$("favorite-button").addEventListener("click",toggleFavorite);
    if($("next-question-button"))$("next-question-button").addEventListener("click",nextQuestion);
    if($("start-study-button"))$("start-study-button").addEventListener("click",()=>startStudy("normal","all"));
    if($("start-mock-button"))$("start-mock-button").addEventListener("click",startMockExam);
    if($("start-review-button"))$("start-review-button").addEventListener("click",()=>{rebuildWrongQuestions();startStudy("wrong","all");});
    if($("start-favorite-button"))$("start-favorite-button").addEventListener("click",startFavoriteStudy);
    if($("close-mock-result"))$("close-mock-result").addEventListener("click",()=>{if($("mock-result-modal"))$("mock-result-modal").style.display="none";});
    setupFilters();createCategoryButtons();
}

function initialize(){
    setupEventListeners();setupAuth();updateAnalytics();currentStudyQuestions=[...questionDatabase];renderQuestion();
    // HTML buttons may call these from inline onclick handlers.
    window.awsMockNext=mockNext;
    window.awsMockPrevious=mockPrevious;
    window.awsMockMark=toggleMockMark;
    window.awsFinishMock=finishMockExam;
}
initialize();
