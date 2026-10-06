/* =========================================================
   LIFE DASHBOARD
   goals.js
========================================================= */


import {

    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc

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


const goalTitleInput =
    document.getElementById("goal-title");


const goalDeadlineInput =
    document.getElementById("goal-deadline");


const addGoalButton =
    document.getElementById("add-goal-button");


const goalsListElement =
    document.getElementById("goals-list");


const goalsCountElement =
    document.getElementById("goals-count");



/* =========================================================
   State
========================================================= */


let currentUser = null;

let goals = [];



/* =========================================================
   Utility
========================================================= */


/*
 * 今日の日付を
 * YYYY-MM-DD
 * で取得
 */

function getTodayKey() {

    const now =
        new Date();


    const year =
        now.getFullYear();


    const month =
        String(
            now.getMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            now.getDate()
        ).padStart(2, "0");


    return `${year}-${month}-${day}`;

}


/*
 * 日付を日本語表示
 */

function formatJapaneseDate(dateKey) {

    if (!dateKey) {

        return "";

    }


    const [
        year,
        month,
        day
    ] =
        dateKey.split("-");


    return `${year}年${Number(month)}月${Number(day)}日`;

}


/*
 * 期限までの日数
 */

function getDaysUntil(deadline) {

    if (!deadline) {

        return null;

    }


    const today =
        new Date(
            `${getTodayKey()}T00:00:00`
        );


    const target =
        new Date(
            `${deadline}T00:00:00`
        );


    return Math.ceil(
        (target - today) /
        (1000 * 60 * 60 * 24)
    );

}


/*
 * HTMLエスケープ
 */

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}



/* =========================================================
   Firestore
========================================================= */


/*
 * Goalsを取得
 */

async function loadGoals() {

    if (!currentUser) {

        return;

    }


    try {

        const goalsRef =
            collection(
                db,
                "users",
                currentUser.uid,
                "goals"
            );


        const snapshot =
            await getDocs(goalsRef);


        goals = [];


        snapshot.forEach(
            (docSnapshot) => {

                const data =
                    docSnapshot.data();


                goals.push({

                    id:
                        docSnapshot.id,

                    title:
                        data.title || "",

                    deadline:
                        data.deadline || "",

                    progress:
                        typeof data.progress === "number"
                            ? data.progress
                            : 0,

                    completed:
                        data.completed === true

                });

            }
        );


        /*
         * 並び順
         *
         * 未完了 → 完了
         * 期限が早い → 遅い
         */

        goals.sort(
            (a, b) => {

                if (
                    a.completed !==
                    b.completed
                ) {

                    return a.completed
                        ? 1
                        : -1;

                }


                if (
                    !a.deadline &&
                    !b.deadline
                ) {

                    return 0;

                }


                if (!a.deadline) {

                    return 1;

                }


                if (!b.deadline) {

                    return -1;

                }


                return a.deadline
                    .localeCompare(
                        b.deadline
                    );

            }
        );


        renderGoals();


    } catch (error) {

        console.error(
            "目標の取得に失敗しました",
            error
        );


        goalsListElement.innerHTML = `

            <div class="empty-message">

                <div class="empty-message-title">
                    目標を読み込めませんでした
                </div>

                <div class="empty-message-text">
                    Firestoreとの通信に失敗しました。
                </div>

            </div>

        `;

    }

}



/* =========================================================
   Render
========================================================= */


function renderGoals() {

    if (!goalsListElement) {

        return;

    }


    /*
     * 件数
     */

    const activeGoals =
        goals.filter(
            goal =>
                goal.completed !== true
        );


    goalsCountElement.textContent =
        `${activeGoals.length}件`;



    /*
     * 目標なし
     */

    if (goals.length === 0) {

        goalsListElement.innerHTML = `

            <div class="empty-message">

                <div class="empty-message-title">
                    目標はまだありません
                </div>

                <div class="empty-message-text">
                    上から最初の目標を追加しましょう。
                </div>

            </div>

        `;

        return;

    }



    /*
     * 目標を描画
     */

    goalsListElement.innerHTML =
        goals.map(
            goal =>
                createGoalHtml(goal)
        ).join("");



    /*
     * ボタンイベント
     */

    goals.forEach(
        goal => {

            const completeButton =
                document.getElementById(
                    `complete-${goal.id}`
                );


            const editButton =
                document.getElementById(
                    `edit-${goal.id}`
                );


            const deleteButton =
                document.getElementById(
                    `delete-${goal.id}`
                );


            if (completeButton) {

                completeButton.addEventListener(
                    "click",
                    () =>
                        toggleGoalComplete(
                            goal
                        )
                );

            }


            if (editButton) {

                editButton.addEventListener(
                    "click",
                    () =>
                        editGoal(
                            goal
                        )
                );

            }


            if (deleteButton) {

                deleteButton.addEventListener(
                    "click",
                    () =>
                        deleteGoal(
                            goal
                        )
                );

            }

        }
    );

}



/*
 * Goal HTML
 */

function createGoalHtml(goal) {

    const progress =
        Math.max(
            0,
            Math.min(
                100,
                Number(goal.progress) || 0
            )
        );


    const daysUntil =
        getDaysUntil(
            goal.deadline
        );


    let deadlineText =
        "期限なし";


    let deadlineClass =
        "goal-deadline";


    if (goal.deadline) {

        deadlineText =
            `期限：${formatJapaneseDate(
                goal.deadline
            )}`;


        if (
            !goal.completed &&
            daysUntil < 0
        ) {

            deadlineText +=
                `　（${Math.abs(daysUntil)}日超過）`;

            deadlineClass +=
                " overdue";

        } else if (
            !goal.completed &&
            daysUntil === 0
        ) {

            deadlineText +=
                "　（今日）";

        } else if (
            !goal.completed &&
            daysUntil > 0
        ) {

            deadlineText +=
                `　（あと${daysUntil}日）`;

        }

    }


    return `

        <div
            class="goal-card ${
                goal.completed
                    ? "completed"
                    : ""
            }">


            <div class="goal-top">


                <div class="goal-title-area">

                    <h2 class="goal-title">

                        ${escapeHtml(
                            goal.title
                        )}

                    </h2>


                    <div
                        class="${deadlineClass}">

                        ${deadlineText}

                    </div>

                </div>


                <div class="goal-progress-number">

                    ${progress}%

                </div>


            </div>


            <div
                class="goal-progress-bar-container">

                <div
                    class="goal-progress-bar"
                    style="width: ${progress}%">
                </div>

            </div>


            <div class="goal-actions">


                <button
                    id="complete-${goal.id}"
                    class="goal-button complete">

                    ${
                        goal.completed
                            ? "↩ 未完了に戻す"
                            : "✓ 完了"
                    }

                </button>


                <button
                    id="edit-${goal.id}"
                    class="goal-button">

                    編集

                </button>


                <button
                    id="delete-${goal.id}"
                    class="goal-button delete">

                    削除

                </button>


            </div>


        </div>

    `;

}



/* =========================================================
   Add Goal
========================================================= */


async function addGoal() {

    if (!currentUser) {

        alert(
            "Firebase認証が完了していません。"
        );

        return;

    }


    const title =
        goalTitleInput.value.trim();


    const deadline =
        goalDeadlineInput.value;


    if (!title) {

        alert(
            "目標を入力してください。"
        );

        goalTitleInput.focus();

        return;

    }


    /*
     * 二重クリック防止
     */

    addGoalButton.disabled = true;


    try {

        const goalsRef =
            collection(
                db,
                "users",
                currentUser.uid,
                "goals"
            );


        await addDoc(
            goalsRef,
            {

                title:
                    title,

                deadline:
                    deadline,

                progress:
                    0,

                completed:
                    false

            }
        );


        /*
         * 入力欄をクリア
         */

        goalTitleInput.value = "";

        goalDeadlineInput.value = "";


        /*
         * 再取得
         */

        await loadGoals();


    } catch (error) {

        console.error(
            "目標の追加に失敗しました",
            error
        );


        alert(
            "目標を追加できませんでした。"
        );


    } finally {

        addGoalButton.disabled = false;

    }

}



/* =========================================================
   Complete
========================================================= */


async function toggleGoalComplete(goal) {

    if (!currentUser) {

        return;

    }


    const newCompleted =
        !goal.completed;


    try {

        const goalRef =
            doc(
                db,
                "users",
                currentUser.uid,
                "goals",
                goal.id
            );


        await updateDoc(
            goalRef,
            {

                completed:
                    newCompleted,

                progress:
                    newCompleted
                        ? 100
                        : goal.progress

            }
        );


        /*
         * ローカル更新
         */

        goal.completed =
            newCompleted;


        if (newCompleted) {

            goal.progress = 100;

        }


        renderGoals();


    } catch (error) {

        console.error(
            "目標状態の更新に失敗しました",
            error
        );


        alert(
            "目標を更新できませんでした。"
        );

    }

}



/* =========================================================
   Edit
========================================================= */


async function editGoal(goal) {

    if (!currentUser) {

        return;

    }


    /*
     * 目標名
     */

    const newTitle =
        prompt(
            "目標を入力してください。",
            goal.title
        );


    if (newTitle === null) {

        return;

    }


    const title =
        newTitle.trim();


    if (!title) {

        alert(
            "目標を入力してください。"
        );

        return;

    }


    /*
     * 期限
     */

    const newDeadline =
        prompt(
            "期限を YYYY-MM-DD 形式で入力してください。\n空欄にすると期限なしになります。",
            goal.deadline
        );


    if (newDeadline === null) {

        return;

    }


    const deadline =
        newDeadline.trim();


    if (
        deadline &&
        !/^\d{4}-\d{2}-\d{2}$/.test(
            deadline
        )
    ) {

        alert(
            "期限は YYYY-MM-DD 形式で入力してください。"
        );

        return;

    }


    /*
     * 進捗率
     */

    const newProgress =
        prompt(
            "進捗率を0〜100で入力してください。",
            goal.progress
        );


    if (newProgress === null) {

        return;

    }


    const progress =
        Number(newProgress);


    if (
        !Number.isFinite(progress) ||
        progress < 0 ||
        progress > 100
    ) {

        alert(
            "進捗率は0〜100の数字で入力してください。"
        );

        return;

    }


    /*
     * 100%なら完了
     */

    const completed =
        progress === 100
            ? true
            : goal.completed &&
              progress === 100;


    try {

        const goalRef =
            doc(
                db,
                "users",
                currentUser.uid,
                "goals",
                goal.id
            );


        await updateDoc(
            goalRef,
            {

                title:
                    title,

                deadline:
                    deadline,

                progress:
                    progress,

                completed:
                    completed

            }
        );


        await loadGoals();


    } catch (error) {

        console.error(
            "目標の編集に失敗しました",
            error
        );


        alert(
            "目標を編集できませんでした。"
        );

    }

}



/* =========================================================
   Delete
========================================================= */


async function deleteGoal(goal) {

    if (!currentUser) {

        return;

    }


    const result =
        confirm(
            `「${goal.title}」を削除しますか？`
        );


    if (!result) {

        return;

    }


    try {

        const goalRef =
            doc(
                db,
                "users",
                currentUser.uid,
                "goals",
                goal.id
            );


        await deleteDoc(
            goalRef
        );


        goals =
            goals.filter(
                item =>
                    item.id !== goal.id
            );


        renderGoals();


    } catch (error) {

        console.error(
            "目標の削除に失敗しました",
            error
        );


        alert(
            "目標を削除できませんでした。"
        );

    }

}



/* =========================================================
   Event
========================================================= */


addGoalButton.addEventListener(
    "click",
    addGoal
);


/*
 * Enterでも追加
 */

goalTitleInput.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Enter"
        ) {

            addGoal();

        }

    }
);



/* =========================================================
   Authentication
========================================================= */


onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            currentUser = null;

            authStatusElement.textContent =
                "Authentication required";

            return;

        }


        currentUser =
            user;


        authStatusElement.textContent =
            "● Online";


        console.log(
            "Firebase認証成功"
        );


        console.log(
            "UID:",
            user.uid
        );


        await loadGoals();

    }
);
