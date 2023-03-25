import { FadingToast } from '../Toast';
import { commentOnRequest, declineRequest, claimRequest, unassignRequest } from './MergeRequestService';

/**
 * Adds functionality for closing librarian requests.
 *
 * @param {NodeList<HTMLElement>} elems Elements that trigger request close updates
 */
export function initCloseLinks(elems) {
    for (const elem of elems) {
        elem.addEventListener('click', function () {
            const mrid = elem.dataset.mrid
            onCloseClick(mrid, elem.parentNode.parentNode)
        })
    }
}

/**
 * Closes librarian request with the given ID.
 *
 * Prompts patron for comment and close the given librarian request.
 * Removes the request's row from the UI on success.
 *
 * @param {Number} mrid Unique ID of the record that is being closed
 * @param {HTMLTableRowElement} parentRow The record's row in the request table
 */
async function onCloseClick(mrid, parentRow) {
    const comment = prompt('(Optional) Why are you closing this request?')
    if (comment !== null) {
        await close(mrid, comment)
            .then(result => result.json())
            .then(data => {
                if (data.status === 'ok') {
                    removeRow(parentRow)
                }
            })
            .catch(e => {
                throw e
            });
    }
}

/**
 * POSTs update to close a librarian request to Open Library's servers.
 *
 * @param {Number} mrid Unique identifier for a librarian request
 * @param {string} comment Message stating why the request was closed
 * @returns {Promise<Response>} The results of the update POST
 */
async function close(mrid, comment) {
    return declineRequest(mrid, comment)
}

/**
 * Adds functionality for commenting on librarian requests.
 *
 * @param {NodeList<HTMLElement>} elems Elements that trigger comments on requests
 */
export function initCommenting(elems) {
    for (const elem of elems) {
        elem.addEventListener('click', function () {
            const mrid = elem.dataset.mrid
            const username = elem.dataset.username;
            onCommentClick(elem.previousElementSibling, mrid, username)
        })
    }
}

/**
 * Comments on given librarian request and updates the UI.
 *
 * @param {HTMLTextAreaElement} textarea The element that contains the comment
 * @param {Number} mrid Unique identifier for the request that is being commented on
 */
async function onCommentClick(textarea, mrid, username) {
    const c = textarea.value;
    const commentCount = document.querySelector(`.comment-count-${mrid}`);

    if (c) {
        await comment(mrid, c)
            .then(result => result.json())
            .then(data => {
                if (data.status === 'ok') {
                    new FadingToast('Comment updated!').show()
                    updateCommentsView(mrid, c, username)
                    textarea.value = ''
                    commentCount.innerHTML ++
                } else {
                    new FadingToast('Failed to submit comment. Please try again in a few moments.').show()
                }
            })
            .catch(e => {
                throw e
            })
    }
}

/**
 * POSTs comment update to Open Library's servers.
 *
 * @param {Number} mrid Unique identifier for a librarian request
 * @param {string} comment The new comment
 * @returns {Promise<Response>} The results of the update POST request
 */
async function comment(mrid, comment) {
    return commentOnRequest(mrid, comment)
}

/**
 * Fetches comment HTML from server and updates table with the results.
 *
 * In the comment cell of the librarian request table, the most recent comment and
 * all other comments are in separate containers.  This function moves the previously
 * newest comment to the end of the old comments container, and adds the new comment
 * to the empty new comment container.
 *
 * @param {Number} mrid Unique identifier for the request that's being commented upon
 * @param {string} comment The new comment
 */
async function updateCommentsView(mrid, comment, username) {


    const commentCell = document.querySelector(`#comment-cell-${mrid}`);
    //const newCommentDiv = commentCell.querySelector('.comment-cell__newest-comment')
    const hiddenCommentDiv = commentCell.querySelector('.comment-cell__old-comments-section');
    const newComment = document.createElement('div')
    newComment.innerHTML += `<div class="mr-comment">
      <div class="mr-comment__body"><a href="">@${username}</a> ${comment}</div>
      </div>`

    hiddenCommentDiv.prepend(newComment);
}

/**
 * Removes the given row from the requests table.
 *
 * @param {HTMLTableRowElement} row The row being removed
 */
function removeRow(row) {
    row.parentNode.removeChild(row)
}


/**
 * Adds functionality for toggling visibility of the older comments.
*
* @param {NodeList<HTMLElement>} elems Links that toggle comment visibility
*/
export function initShowAllCommentsLinks(elems) {
    for (const elem of elems) {
        elem.addEventListener('click', function() {
            toggleAllComments(elem)
        })
    }
}

/**
 * Toggles visibility of a request's older comments.
*
* @param {HTMLELement} elem Element which contains a reference to the old comments
*/
function toggleAllComments(elem) {
    //Id 2
    const targetId = elem.dataset.targetId;
    const targetId2 = elem.dataset.latestComment || 0;
    const targetBtnClass = elem.dataset.btnClass;

    const target = document.querySelector(`#${targetId}`)
    const target2 = document.querySelector(`#${targetId2}`)
    const targetBtn = document.querySelector(`.${targetBtnClass}`);

    target.classList.toggle('hidden')
    target2.classList.toggle('hidden')
    targetBtn.classList.toggle('border-toggle');
}

/**
 * Adds functionality for claiming librarian requests.
 *
 * @param {NodeList<HTMLElement>} elems Elements that, on click, initiates a claim
 */
export function initRequestClaiming(elems) {
    for (const elem of elems) {
        elem.addEventListener('click', function() {
            const mrid = elem.dataset.mrid
            claim(mrid, elem)
        })
    }
}

/**
 * Sends a claim request to the server and updates the table on success.
 *
 * @param {Number} mrid Unique identifier for the request being claimed
 */
async function claim(mrid) {
    await claimRequest(mrid)
        .then(result => result.json())
        .then(data => {
            if (data.status === 'ok') {
                const reviewerHtml = `${data.reviewer}
                    <span class="mr-unassign" data-mrid="${mrid}">&times;</span>`
                updateRow(mrid, data.newStatus, reviewerHtml)

                // Hide the row's merge link:
                const mergeLink = document.querySelector(`#mr-resolve-link-${mrid}`)
                if (!mergeLink.classList.contains('hidden')) {
                    toggleMergeLink(mergeLink)
                }
            }
        })
}

/**
 * Updates status and reviewer of the designated request table row.
 *
 * @param {Number} mrid The row's unique identifier
 * @param {string} status Optional new value for the row's status cell
 * @param {string} reviewer Optional new value for the row's reviewer cell
 */
function updateRow(mrid, status=null, reviewer=null) {
    if (status) {
        const statusCell = document.querySelector(`#status-cell-${mrid}`)
        statusCell.textContent = status
    }
    if (reviewer) {
        const reviewerCell = document.querySelector(`#reviewer-cell-${mrid}`)
        reviewerCell.innerHTML = reviewer

        initUnassignment(reviewerCell.querySelectorAll('.mr-unassign'))
    }
}

export function initUnassignment(elems) {
    for (const elem of elems) {
        elem.addEventListener('click', function() {
            const mrid = elem.dataset.mrid
            unassign(mrid)
        })
    }
}

async function unassign(mrid) {
    await unassignRequest(mrid)
        .then(result => result.json())
        .then(data => {
            if (data.status === 'ok') {
                updateRow(mrid, data.newStatus, ' ')

                // Display the row's merge link:
                const mergeLink = document.querySelector(`#mr-resolve-link-${mrid}`)
                if (mergeLink.classList.contains('hidden')) {
                    toggleMergeLink(mergeLink)
                }
            }
        })
}

/**
 * Toggles 'hidden' class for element with given ID.
 *
 * @param {HTMLElement} mergeLink Reference to a merge link element
 */
function toggleMergeLink(mergeLink) {
    if (mergeLink) {
        mergeLink.classList.toggle('hidden')
    }
}