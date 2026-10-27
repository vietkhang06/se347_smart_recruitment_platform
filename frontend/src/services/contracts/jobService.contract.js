/**
 * @typedef {Object} IJobService
 * @property {(companyId?: string, filters?: Object) => Promise<import('../../models/JobViewModel').JobViewModel[]>} getEmployerJobs
 * @property {(jobId: string) => Promise<import('../../models/JobViewModel').JobViewModel>} getJobById
 * @property {(jobInput: Object, companyId?: string) => Promise<import('../../models/JobViewModel').JobViewModel>} createJob
 * @property {(jobId: string, jobUpdate: Object) => Promise<import('../../models/JobViewModel').JobViewModel>} updateJob
 * @property {(jobId: string, status: string) => Promise<import('../../models/JobViewModel').JobViewModel>} updateJobStatus
 * @property {(jobId: string) => Promise<boolean>} deleteJob
 * @property {() => Promise<Array<{id: string, name: string}>>} getCategories
 * @property {(categoryId?: string) => Promise<Array<{id: string, name: string}>>} getSkills
 */
