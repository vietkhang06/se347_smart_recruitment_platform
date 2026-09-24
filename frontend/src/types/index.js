/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {'candidate' | 'employer' | 'admin'} role
 * @property {boolean} loggedIn
 * @property {string} [company]
 * @property {string} [avatar]
 */

/**
 * @typedef {Object} Job
 * @property {string|number} id
 * @property {string} title
 * @property {string} company
 * @property {string} logo
 * @property {string} salary
 * @property {string} location
 * @property {string} type
 * @property {number} match
 * @property {string} category
 * @property {string} exp
 * @property {string} posted
 * @property {string} [status]
 * @property {number} [applicants]
 * @property {number} [views]
 * @property {string} [description]
 * @property {string[]} [requirements]
 * @property {string[]} [skills]
 */

/**
 * @typedef {Object} Candidate
 * @property {string|number} id
 * @property {string} name
 * @property {string} role
 * @property {string} initials
 * @property {string} experience
 * @property {string} location
 * @property {number} match
 * @property {string[]} skills
 * @property {string} stage
 * @property {string} [email]
 * @property {string} [phone]
 */

/**
 * @typedef {Object} Application
 * @property {string} id
 * @property {string|number} jobId
 * @property {string} jobTitle
 * @property {string} company
 * @property {string} logo
 * @property {string} date
 * @property {string} stage
 * @property {string} next
 */

export {};
