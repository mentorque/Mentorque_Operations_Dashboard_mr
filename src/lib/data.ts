export type ActionStatus = "done" | "not-done" | "on-hold" | "scheduled" | "na";
export type RiskLevel = "normal" | "watch" | "at-risk";
export type StageId =
  | "onboarding"
  | "resume-building"
  | "mentor-intro"
  | "projects-portfolio"
  | "payment"
  | "outreach"
  | "interview-diagnostics"
  | "mock-interview-1"
  | "mock-interview-2"
  | "mock-interview-3"
  | "alumni";

export interface Stage {
  id: StageId;
  name: string;
  order: number;
  actionIds: number[];
}

export interface JourneyAction {
  id: number;
  title: string;
  shortTitle: string;
  duration?: string;
  poc?: string;
  stageId: StageId;
}

export interface CandidateAction {
  actionId: number;
  status: ActionStatus;
  date?: string;
  comment?: string;
}

export interface Candidate {
  id: string;
  name: string;
  role: string;
  mentor: string;
  currentStageId: StageId;
  riskLevel: RiskLevel;
  isAlumni: boolean;
  optedOut?: boolean;
  paceStatus?: "at-risk" | "watch" | "on-track";
  enrolledDate: string;
  actions: CandidateAction[];
  notes?: string;
}

export const STAGES: Stage[] = [
  { id: "onboarding",          name: "Onboarding",           order: 1, actionIds: [1, 2, 3] },
  { id: "resume-building",     name: "Resume Building",      order: 2, actionIds: [4, 5, 6, 7] },
  { id: "mentor-intro",        name: "Mentor Introduction",  order: 3, actionIds: [8, 9] },
  { id: "projects-portfolio",  name: "Projects & Portfolio", order: 4, actionIds: [10, 11, 12, 13] },
  { id: "payment",             name: "Payment & Admin",      order: 5, actionIds: [14] },
  { id: "outreach",            name: "Outreach & LinkedIn",       order: 6,  actionIds: [15, 16, 17, 18] },
  { id: "interview-diagnostics", name: "Interview Diagnostics",   order: 7,  actionIds: [19, 20, 21] },
  { id: "mock-interview-1",    name: "Mock Interview 1",          order: 8,  actionIds: [22, 23] },
  { id: "mock-interview-2",    name: "Mock Interview 2",          order: 9,  actionIds: [24, 25] },
  { id: "mock-interview-3",    name: "Mock Interview 3",          order: 10, actionIds: [26, 27] },
  { id: "alumni",              name: "Alumni / Placed",           order: 11, actionIds: [] },
];

export const JOURNEY_ACTIONS: JourneyAction[] = [
  { id: 1,  stageId: "onboarding",         shortTitle: "Welcome & Tally Form",            title: "Group Making, Welcome Onboard Message and Tally Form",                                                                poc: "Ops Team A" },
  { id: 2,  stageId: "onboarding",         shortTitle: "Onboarding Call",                 title: "Schedule Onboarding Call – Portal and Extension Walkthrough",                        duration: "30 min",              poc: "Ops" },
  { id: 3,  stageId: "onboarding",         shortTitle: "Resume Compiler Shared",          title: "Share Resume Compiler on Group with Prompt and Reference CVs" },
  { id: 4,  stageId: "resume-building",    shortTitle: "CV Draft Submitted",              title: "Candidate Submits Structured CV PDF" },
  { id: 5,  stageId: "resume-building",    shortTitle: "Resume Revamp Call",              title: "Resume Revamp Call – Cover basics, tailor, send MOM",                               duration: "45 min",              poc: "Ops Team A" },
  { id: 6,  stageId: "resume-building",    shortTitle: "Resume Draft Follow-up",          title: "Follow-up with candidate for Updated Resume Draft" },
  { id: 7,  stageId: "resume-building",    shortTitle: "Resume Refinement (2–3 iters)",   title: "Give Refinement Pointers on Updated Resume (2–3 iterations)" },
  { id: 8,  stageId: "mentor-intro",       shortTitle: "First Mentor Call",               title: "First Mentor Call – Resume Finalisation, Elevator Pitch, Outreach & Application Strategy", duration: "60 min",  poc: "Mentor" },
  { id: 9,  stageId: "mentor-intro",       shortTitle: "Mentor Call MOM",                 title: "Send MOM after Mentor Call and get feedback on chat" },
  { id: 10, stageId: "projects-portfolio", shortTitle: "Projects Call",                   title: "Detailed Projects Call with Mentor",                                                duration: "45 min",              poc: "Mentor" },
  { id: 11, stageId: "projects-portfolio", shortTitle: "Projects Doc Shared",             title: "Share Projects Doc – Candidate Builds Projects and Updates Resume" },
  { id: 12, stageId: "projects-portfolio", shortTitle: "Portfolio Review Call",           title: "CV Review and Portfolio Finalisation Call",                                          duration: "20 min",              poc: "Ops Team A" },
  { id: 13, stageId: "projects-portfolio", shortTitle: "Portfolio Delivered",             title: "AI Extension, Portfolio Giving, Changes and Send MOM after Call",                   duration: "30 min",              poc: "Ops Team A" },
  { id: 14, stageId: "payment",            shortTitle: "Payment Message Sent",            title: "Send the Payment Message" },
  { id: 15, stageId: "outreach", shortTitle: "LinkedIn & Outreach Call",
    title: "LinkedIn Profile Optimisation and Outreach Strategy Call – Send MOM",
    duration: "45 min", poc: "Ops Team A" },

  { id: 16, stageId: "outreach", shortTitle: "Outreach Guidance Session",
    title: "Outreach Guidance Session – Target Companies, Platforms and Application Strategy",
    duration: "30 min", poc: "Mentor" },

  { id: 17, stageId: "outreach", shortTitle: "Message Templates Shared",
    title: "Share Outreach Message Templates and Application Tracker with Candidate" },

  { id: 18, stageId: "outreach", shortTitle: "Applications Started",
    title: "Confirm Candidate Has Started Applying – Minimum 5 Applications Per Day Target Set" },

  { id: 19, stageId: "interview-diagnostics", shortTitle: "Interview Diagnosis Form Sent",
    title: "Send Interview Diagnosis Google Form and Nudge Candidate to Fill It" },

  { id: 20, stageId: "interview-diagnostics", shortTitle: "Diagnosis & Mock Prep Call",
    title: "Review Interview Diagnosis Results – Build Mock Interview Prep Plan with Candidate",
    duration: "45 min", poc: "Ops Team A" },

  { id: 21, stageId: "interview-diagnostics", shortTitle: "Interview Cheatsheet Shared",
    title: "Share Personalised Interview Cheatsheet and STAR Framework Guide" },

  { id: 22, stageId: "mock-interview-1", shortTitle: "Mock Interview 1",
    title: "Mock Interview 1 – Share MOM and Collect Feedback from Both Sides",
    duration: "60 min", poc: "Mentor" },

  { id: 23, stageId: "mock-interview-1", shortTitle: "Feedback Call 1",
    title: "Short Feedback Call 1 – Review Mock Interview and Check Application Progress",
    duration: "20 min", poc: "Ops Team B" },

  { id: 24, stageId: "mock-interview-2", shortTitle: "Mock Interview 2",
    title: "Mock Interview 2 – Share MOM and Collect Feedback",
    duration: "60 min", poc: "Mentor" },

  { id: 25, stageId: "mock-interview-2", shortTitle: "Feedback Call 2",
    title: "Short Feedback Call 2 – Review Progress and Plan for Final Round",
    duration: "20 min", poc: "Ops Team B" },

  { id: 26, stageId: "mock-interview-3", shortTitle: "Mock Interview 3",
    title: "Mock Interview 3 – Final Round – Share MOM and Collect Feedback",
    duration: "60 min", poc: "Mentor" },

  { id: 27, stageId: "mock-interview-3", shortTitle: "Feedback Call 3",
    title: "Final Feedback Call – Application Progress Check and Next Steps",
    duration: "20 min", poc: "Ops Team B" },
];

const CANDIDATES_LEGACY = [
  // ─────────────────────────────────────────────────────────────────────────────
  // 1. SHWETA  – PM/HR  – Mentor: Adori
  // Enrolled: 13 Feb | Outreach call done 7 Mar | Next: Interview Diagnosis Form
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "shweta",
    name: "Shweta",
    role: "PM / HR",
    mentor: "Adori",
    currentStageId: "outreach",
    riskLevel: "normal",
    isAlumni: false,
    enrolledDate: "13 Feb 2026",
    notes:
      "Finance connection with Afeef was noted during mentor call – ops team follow-up required. Ayush guidance session done on 4 Mar with feedback and next steps. Outreach strategy and LinkedIn call completed on 7 Mar. Next: send Interview Diagnosis Form.",
    actions: [
      { actionId: 1,  status: "done",     date: "13 Feb" },
      { actionId: 2,  status: "done",     date: "14 Feb" },
      { actionId: 3,  status: "done",     date: "13 Feb" },
      { actionId: 4,  status: "done",     date: "14 Feb" },
      { actionId: 5,  status: "done",     date: "15 Feb" },
      { actionId: 6,  status: "done",     date: "16 Feb" },
      { actionId: 7,  status: "done",     date: "16 Feb" },
      { actionId: 8,  status: "done",     date: "17 Feb" },
      { actionId: 9,  status: "done",     date: "17 Feb" },
      { actionId: 10, status: "not-done" },
      { actionId: 11, status: "not-done" },
      { actionId: 12, status: "done",     date: "24 Feb" },
      { actionId: 13, status: "done",     date: "24 Feb" },
      { actionId: 14, status: "done",     date: "2 Mar" },
      { actionId: 15, status: "done",     date: "4 Mar",  comment: "Feedback and next steps agreed" },
      { actionId: 16, status: "done",     date: "7 Mar",  comment: "Scheduled and completed on 7 Mar" },
      { actionId: 17, status: "not-done" },
      { actionId: 18, status: "not-done" },
      { actionId: 19, status: "not-done" },
      { actionId: 20, status: "not-done" },
      { actionId: 21, status: "not-done" },
      { actionId: 22, status: "not-done" },
      { actionId: 23, status: "not-done" },
      { actionId: 24, status: "not-done" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. AISHWARYA  – Digital Marketing  – Mentor: Nirvan
  // Enrolled: 26 Feb | Portfolio done 7 Mar | Next: LinkedIn & Outreach Call
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "aishwarya",
    name: "Aishwarya",
    role: "Digital Marketing",
    mentor: "Nirvan",
    currentStageId: "outreach",
    riskLevel: "normal",
    isAlumni: false,
    enrolledDate: "26 Feb 2026",
    notes:
      "Finance connection with Afeef to be arranged – ops follow-up required by 7 Mar. Projects call done 12 Mar with Nirvan. CV review and portfolio finalised on 7 Mar. Payment done. Next: LinkedIn & Outreach Strategy Call.",
    actions: [
      { actionId: 1,  status: "done",     date: "26 Feb" },
      { actionId: 2,  status: "done",     date: "27 Feb" },
      { actionId: 3,  status: "done",     date: "27 Feb" },
      { actionId: 4,  status: "done",     date: "1 Mar" },
      { actionId: 5,  status: "done",     date: "2 Mar" },
      { actionId: 6,  status: "done",     date: "3 Mar" },
      { actionId: 7,  status: "done",     date: "4 Mar" },
      { actionId: 8,  status: "done",     date: "4 Mar",  comment: "Connect with Afeef for finance – ops follow-up by 7 Mar" },
      { actionId: 9,  status: "done" },
      { actionId: 10, status: "done",     date: "12 Mar", comment: "With Nirvan" },
      { actionId: 11, status: "done" },
      { actionId: 12, status: "done",     date: "7 Mar" },
      { actionId: 13, status: "done",     date: "7 Mar",  comment: "Scheduled for 7 Mar" },
      { actionId: 14, status: "done",     date: "3 Mar" },
      { actionId: 15, status: "na" },
      { actionId: 16, status: "not-done" },
      { actionId: 17, status: "not-done" },
      { actionId: 18, status: "not-done" },
      { actionId: 19, status: "not-done" },
      { actionId: 20, status: "not-done" },
      { actionId: 21, status: "not-done" },
      { actionId: 22, status: "not-done" },
      { actionId: 23, status: "not-done" },
      { actionId: 24, status: "not-done" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. SHUBHAM  – Project Manager  – Mentor: TBD (BLOCKING RISK)
  // Enrolled: 26 Feb | Mentor call done but No mentor for projects stage
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "shubham",
    name: "Shubham",
    role: "Project Manager",
    mentor: "Ashwini",
    currentStageId: "projects-portfolio",
    riskLevel: "at-risk",
    isAlumni: false,
    enrolledDate: "26 Feb 2026",
    notes:
      "URGENT: No mentor has been assigned for the Projects & Portfolio stage. The Detailed Projects Call (Action 10) is blocked. Finance connection with Afeef was noted at the First Mentor Call. Assign mentor immediately to unblock progress.",
    actions: [
      { actionId: 1,  status: "done",     date: "26 Feb" },
      { actionId: 2,  status: "done",     date: "27 Feb" },
      { actionId: 3,  status: "done",     date: "27 Feb" },
      { actionId: 4,  status: "done",     date: "1 Mar" },
      { actionId: 5,  status: "done",     date: "2 Mar" },
      { actionId: 6,  status: "done",     date: "3 Mar" },
      { actionId: 7,  status: "done",     date: "4 Mar" },
      { actionId: 8,  status: "done",     date: "4 Mar",  comment: "Finance connect note – ops follow-up awaited" },
      { actionId: 9,  status: "not-done" },
      { actionId: 10, status: "not-done", comment: "Blocked – mentor not assigned" },
      { actionId: 11, status: "not-done" },
      { actionId: 12, status: "not-done" },
      { actionId: 13, status: "not-done" },
      { actionId: 14, status: "not-done" },
      { actionId: 15, status: "not-done" },
      { actionId: 16, status: "not-done" },
      { actionId: 17, status: "not-done" },
      { actionId: 18, status: "not-done" },
      { actionId: 19, status: "not-done" },
      { actionId: 20, status: "not-done" },
      { actionId: 21, status: "not-done" },
      { actionId: 22, status: "not-done" },
      { actionId: 23, status: "not-done" },
      { actionId: 24, status: "not-done" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. JAIPRAKASH  – Analyst  – Mentor: TBD
  // Enrolled: 24 Feb | First Mentor Call on hold (was scheduled 8 Mar)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "jaiprakash",
    name: "Jaiprakash",
    role: "Analyst",
    mentor: "TBD",
    currentStageId: "mentor-intro",
    riskLevel: "watch",
    isAlumni: false,
    enrolledDate: "24 Feb 2026",
    notes:
      "First Mentor Call is on hold. Was scheduled for 8th March but status is still On Hold. Mentor not yet confirmed. Need to follow up and reschedule urgently.",
    actions: [
      { actionId: 1,  status: "done",     date: "24 Feb" },
      { actionId: 2,  status: "done",     date: "25 Feb" },
      { actionId: 3,  status: "done",     date: "25 Feb" },
      { actionId: 4,  status: "done",     date: "26 Feb" },
      { actionId: 5,  status: "done",     date: "26 Feb" },
      { actionId: 6,  status: "done",     date: "26 Feb" },
      { actionId: 7,  status: "done",     date: "27 Feb" },
      { actionId: 8,  status: "on-hold",  date: "8 Mar",  comment: "Scheduled for 8th March – confirm status" },
      { actionId: 9,  status: "not-done" },
      { actionId: 10, status: "not-done" },
      { actionId: 11, status: "not-done" },
      { actionId: 12, status: "not-done" },
      { actionId: 13, status: "not-done" },
      { actionId: 14, status: "not-done" },
      { actionId: 15, status: "not-done" },
      { actionId: 16, status: "not-done" },
      { actionId: 17, status: "not-done" },
      { actionId: 18, status: "not-done" },
      { actionId: 19, status: "not-done" },
      { actionId: 20, status: "not-done" },
      { actionId: 21, status: "not-done" },
      { actionId: 22, status: "not-done" },
      { actionId: 23, status: "not-done" },
      { actionId: 24, status: "not-done" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. NITISH  – SDE  – Mentor: Agniva
  // Enrolled: 2 Feb | Most advanced – Mock Interview scheduled | Fast tracker
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "nitish",
    name: "Nitish",
    role: "SDE",
    mentor: "Agniva",
    currentStageId: "interview-prep",
    riskLevel: "normal",
    isAlumni: false,
    enrolledDate: "2 Feb 2026",
    notes:
      "Fastest progressor in the current batch. Payment cleared on 16 Feb. Interview Diagnostic Sheet was not filled by candidate – follow up needed. Mock Interview 1 scheduled – confirm timing with Agniva.",
    actions: [
      { actionId: 1,  status: "done",     date: "2 Feb" },
      { actionId: 2,  status: "done",     date: "4 Feb" },
      { actionId: 3,  status: "done",     date: "5 Feb" },
      { actionId: 4,  status: "done",     date: "6 Feb" },
      { actionId: 5,  status: "done",     date: "6 Feb",  comment: "Done with Internal Team" },
      { actionId: 6,  status: "done",     date: "6 Feb" },
      { actionId: 7,  status: "done",     date: "6 Feb" },
      { actionId: 8,  status: "done",     date: "8 Feb",  comment: "Done with Ashwini" },
      { actionId: 9,  status: "done",     date: "9 Feb" },
      { actionId: 10, status: "done",     date: "13 Feb", comment: "Done with Agniva" },
      { actionId: 11, status: "done",     date: "13 Feb" },
      { actionId: 12, status: "done",     date: "16 Feb" },
      { actionId: 13, status: "done",     date: "16 Feb" },
      { actionId: 14, status: "done",     date: "16 Feb", comment: "Payment cleared" },
      { actionId: 15, status: "done" },
      { actionId: 16, status: "done",     date: "28 Feb", comment: "Scheduled on 28th Feb" },
      { actionId: 17, status: "done",     date: "8 Feb",  comment: "Form sent – candidate has not filled it yet" },
      { actionId: 18, status: "done",     date: "13 Feb", comment: "Interview Diagnostic Sheet still pending from candidate" },
      { actionId: 19, status: "scheduled",               comment: "Mock Interview 1 scheduled – confirm with Agniva" },
      { actionId: 20, status: "not-done" },
      { actionId: 21, status: "not-done" },
      { actionId: 22, status: "not-done" },
      { actionId: 23, status: "not-done" },
      { actionId: 24, status: "not-done" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. ZESHAAN  – Analyst  – Mentor: Gayatri
  // Enrolled: 2 Feb | Interview Prep started | Payment outstanding (watch)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "zeshaan",
    name: "Zeshaan",
    role: "Analyst",
    mentor: "Gayatri",
    currentStageId: "interview-prep",
    riskLevel: "watch",
    isAlumni: false,
    enrolledDate: "2 Feb 2026",
    notes:
      "Full payment was not made at the time of the Projects Call (4 Mar). A 3-instalment payment plan was agreed – payment scheduled for 6 Mar. Keep tracking payment confirmation. Projects Doc is on hold until payment clears. Mock Interview 1 done on 8 Mar.",
    actions: [
      { actionId: 1,  status: "done",     date: "2 Feb" },
      { actionId: 2,  status: "done",     date: "4 Feb" },
      { actionId: 3,  status: "done",     date: "5 Feb" },
      { actionId: 4,  status: "done",     date: "6 Feb",  comment: "Done with Internal Team" },
      { actionId: 5,  status: "done",     date: "8 Feb",  comment: "Done with Internal Team" },
      { actionId: 6,  status: "done",     date: "10 Feb" },
      { actionId: 7,  status: "done",     date: "12 Feb" },
      { actionId: 8,  status: "done",     date: "21 Feb", comment: "With Gayatri" },
      { actionId: 9,  status: "done" },
      { actionId: 10, status: "done",     date: "4 Mar",  comment: "Full payment not made at this point" },
      { actionId: 11, status: "on-hold",  date: "4 Mar",  comment: "On hold pending payment confirmation" },
      { actionId: 12, status: "done",     date: "25 Feb" },
      { actionId: 13, status: "done",     date: "25 Feb" },
      { actionId: 14, status: "scheduled",date: "6 Mar",  comment: "3-instalment payment plan – send confirmation message" },
      { actionId: 15, status: "done" },
      { actionId: 16, status: "done",     date: "25 Feb" },
      { actionId: 17, status: "not-done", comment: "To be done in next call (10–12 Mar)" },
      { actionId: 18, status: "not-done", comment: "To be done together in next call" },
      { actionId: 19, status: "done",     date: "8 Mar",  comment: "Mock Interview 1 done" },
      { actionId: 20, status: "not-done" },
      { actionId: 21, status: "not-done" },
      { actionId: 22, status: "not-done" },
      { actionId: 23, status: "not-done" },
      { actionId: 24, status: "not-done" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. DYUTI  – Analyst  – Mentor: Gayatri  (PREVIOUS COHORT / ALUMNI)
  // Enrolled: 5 Jan | Completed through Mock Interview 1 + feedback call
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "dyuti",
    name: "Dyuti",
    role: "Analyst",
    mentor: "Gayatri",
    currentStageId: "alumni",
    riskLevel: "normal",
    isAlumni: true,
    enrolledDate: "5 Jan 2026",
    notes:
      "Previous cohort candidate. Completed the program through Mock Interview 1 (21 Feb) and the follow-up feedback call. Projects formal steps were not applicable for this cohort.",
    actions: [
      { actionId: 1,  status: "done",     date: "5 Jan" },
      { actionId: 2,  status: "done",     date: "5 Jan" },
      { actionId: 3,  status: "done",     date: "5 Jan" },
      { actionId: 4,  status: "done",     date: "5 Jan" },
      { actionId: 5,  status: "done",     date: "10 Jan" },
      { actionId: 6,  status: "done",     date: "10 Jan" },
      { actionId: 7,  status: "done",     date: "10 Jan" },
      { actionId: 8,  status: "done",     date: "14 Jan", comment: "With Gayatri" },
      { actionId: 9,  status: "done",     date: "14 Jan" },
      { actionId: 10, status: "na",                       comment: "Previous cohort – step not applicable" },
      { actionId: 11, status: "na",                       comment: "Previous cohort – step not applicable" },
      { actionId: 12, status: "done",     date: "20 Jan" },
      { actionId: 13, status: "done",     date: "20 Jan" },
      { actionId: 14, status: "done",     date: "28 Jan", comment: "Payment cleared" },
      { actionId: 15, status: "na" },
      { actionId: 16, status: "done",     date: "6 Feb" },
      { actionId: 17, status: "done",     date: "8 Feb" },
      { actionId: 18, status: "done",     date: "13 Feb" },
      { actionId: 19, status: "done",     date: "21 Feb", comment: "With Gayatri" },
      { actionId: 20, status: "done",     date: "21 Feb", comment: "Taken on the group" },
      { actionId: 21, status: "not-done" },
      { actionId: 22, status: "not-done" },
      { actionId: 23, status: "not-done" },
      { actionId: 24, status: "not-done" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. YASHASVI  – Analyst  – Mentor: Gayatri  (PREVIOUS COHORT / ALUMNI)
  // Enrolled: 5 Jan | Completed through Mock Interview 2 | Strategy coaching done
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "yashasvi",
    name: "Yashasvi",
    role: "Analyst",
    mentor: "Gayatri",
    currentStageId: "alumni",
    riskLevel: "normal",
    isAlumni: true,
    enrolledDate: "5 Jan 2026",
    notes:
      "Previous cohort candidate. Completed through Mock Interview 2. Key coaching moment (20 Feb): candidate was not applying with the created resume – application strategy corrected, extension usage improved, 5+ applications/day target set.",
    actions: [
      { actionId: 1,  status: "done",     date: "5 Jan" },
      { actionId: 2,  status: "done",     date: "5 Jan",  comment: "Helped with KPMG application CV tailoring" },
      { actionId: 3,  status: "done",     date: "5 Jan" },
      { actionId: 4,  status: "done",     date: "5 Jan" },
      { actionId: 5,  status: "done",     date: "10 Jan" },
      { actionId: 6,  status: "done",     date: "10 Jan" },
      { actionId: 7,  status: "done",     date: "10 Jan" },
      { actionId: 8,  status: "done",     date: "14 Jan", comment: "With Gayatri" },
      { actionId: 9,  status: "done",     date: "14 Jan" },
      { actionId: 10, status: "na",                       comment: "Previous cohort – step not applicable" },
      { actionId: 11, status: "na",                       comment: "Previous cohort – step not applicable" },
      { actionId: 12, status: "done",     date: "20 Jan" },
      { actionId: 13, status: "done",     date: "20 Jan" },
      { actionId: 14, status: "done",     date: "28 Jan", comment: "Payment cleared" },
      { actionId: 15, status: "na" },
      { actionId: 16, status: "done",     date: "5 Feb" },
      { actionId: 17, status: "done",     date: "4 Feb" },
      { actionId: 18, status: "done",     date: "5 Feb",  comment: "Shared portfolio and interview diagnostic sheet" },
      { actionId: 19, status: "done",     date: "7 Feb",  comment: "With Gayatri" },
      { actionId: 20, status: "done",     date: "10 Feb" },
      { actionId: 21, status: "done",     date: "19 Feb", comment: "Mock Interview 2 done" },
      { actionId: 22, status: "done",     date: "20 Feb", comment: "Candidate not applying with created resume – strategy corrected, 5+ apps/day target set" },
      { actionId: 23, status: "not-done" },
      { actionId: 24, status: "not-done" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. CHARAN  – Cloud Ops  – Mentor: Agniva
  // Enrolled: 20 Dec 2024 | Mock Interview 1 done (1 Mar) with detailed feedback
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "charan",
    name: "Charan",
    role: "Cloud Ops",
    mentor: "Agniva",
    currentStageId: "interview-prep",
    riskLevel: "normal",
    isAlumni: false,
    enrolledDate: "20 Dec 2025",
    notes:
      "Detailed Mock Interview 1 feedback (1 Mar):\n• Read about the company before interviews\n• Follow STAR framework in all answers\n• Deployment strategy unclear – needs more prep\n• Confused with numbers – practise quantification\n• Camera and voice quality terrible – fix setup before next interview\n• Review AWS/Terraform concepts\n• Practise mock interviews with LLMs",
    actions: [
      { actionId: 1,  status: "done",     date: "20 Dec" },
      { actionId: 2,  status: "done",     date: "23 Dec" },
      { actionId: 3,  status: "done",     date: "24 Dec" },
      { actionId: 4,  status: "done",     date: "28 Jan" },
      { actionId: 5,  status: "done",     date: "9 Jan" },
      { actionId: 6,  status: "done",     date: "9 Jan" },
      { actionId: 7,  status: "done",     date: "14 Jan" },
      { actionId: 8,  status: "done",     date: "17 Jan" },
      { actionId: 9,  status: "done",     date: "18 Jan" },
      { actionId: 10, status: "na",                       comment: "Previous cohort – step not applicable" },
      { actionId: 11, status: "na",                       comment: "Previous cohort – step not applicable" },
      { actionId: 12, status: "done",     date: "20 Jan" },
      { actionId: 13, status: "done",     date: "20 Jan" },
      { actionId: 14, status: "done",     date: "23 Jan", comment: "Paid on 30 Jan" },
      { actionId: 15, status: "na" },
      { actionId: 16, status: "done",     date: "12 Feb", comment: "Outreach sheet shared on 20 Feb" },
      { actionId: 17, status: "done",     date: "8 Feb" },
      { actionId: 18, status: "done",     date: "22 Feb" },
      { actionId: 19, status: "done",     date: "1 Mar",  comment: "Mock Interview 1 done – detailed feedback shared" },
      { actionId: 20, status: "not-done" },
      { actionId: 21, status: "not-done" },
      { actionId: 22, status: "not-done" },
      { actionId: 23, status: "not-done" },
      { actionId: 24, status: "not-done" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. SAI CHARAN  – SDE  – Mentor: Ashwini  (India-based)
  // Enrolled: ~5 Jan | Early resume building stage
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "sai-charan",
    name: "Sai Charan",
    role: "SDE",
    mentor: "Ashwini",
    currentStageId: "resume-building",
    riskLevel: "normal",
    isAlumni: false,
    enrolledDate: "5 Jan 2026",
    notes: "India-based candidate. Early in the program – resume building underway. Limited tracking data available in the ops sheet.",
    actions: [
      { actionId: 1,  status: "done" },
      { actionId: 2,  status: "done" },
      { actionId: 3,  status: "done" },
      { actionId: 4,  status: "done" },
      { actionId: 5,  status: "done" },
      { actionId: 6,  status: "not-done" },
      { actionId: 7,  status: "not-done" },
      { actionId: 8,  status: "not-done" },
      { actionId: 9,  status: "not-done" },
      { actionId: 10, status: "not-done" },
      { actionId: 11, status: "not-done" },
      { actionId: 12, status: "not-done" },
      { actionId: 13, status: "not-done" },
      { actionId: 14, status: "not-done" },
      { actionId: 15, status: "not-done" },
      { actionId: 16, status: "not-done" },
      { actionId: 17, status: "not-done" },
      { actionId: 18, status: "not-done" },
      { actionId: 19, status: "not-done" },
      { actionId: 20, status: "not-done" },
      { actionId: 21, status: "not-done" },
      { actionId: 22, status: "not-done" },
      { actionId: 23, status: "not-done" },
      { actionId: 24, status: "not-done" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 11. LEKHRAJ  – Analyst  – Mentor: Adori
  // Enrolled: 5 Jan | Outreach call done 21 Feb | Next: Interview Diagnosis Form
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "lekhraj",
    name: "Lekhraj",
    role: "Analyst",
    mentor: "Adori",
    currentStageId: "outreach",
    riskLevel: "normal",
    isAlumni: false,
    enrolledDate: "5 Jan 2026",
    notes:
      "LinkedIn and outreach strategy call done on 21 Feb. 1st CV iteration completed on 11 Jan. Next: send Interview Diagnosis Form and schedule Mock Interview.",
    actions: [
      { actionId: 1,  status: "done",     date: "5 Jan" },
      { actionId: 2,  status: "done",     date: "8 Jan" },
      { actionId: 3,  status: "done",     date: "8 Jan" },
      { actionId: 4,  status: "done",     date: "10 Jan" },
      { actionId: 5,  status: "done",     date: "11 Jan", comment: "1st iteration done" },
      { actionId: 6,  status: "done",     date: "12 Jan" },
      { actionId: 7,  status: "done",     date: "13 Jan" },
      { actionId: 8,  status: "done" },
      { actionId: 9,  status: "done" },
      { actionId: 10, status: "done" },
      { actionId: 11, status: "done" },
      { actionId: 12, status: "done" },
      { actionId: 13, status: "done" },
      { actionId: 14, status: "done" },
      { actionId: 15, status: "na" },
      { actionId: 16, status: "done",     date: "21 Feb" },
      { actionId: 17, status: "not-done" },
      { actionId: 18, status: "not-done" },
      { actionId: 19, status: "not-done" },
      { actionId: 20, status: "not-done" },
      { actionId: 21, status: "not-done" },
      { actionId: 22, status: "not-done" },
      { actionId: 23, status: "not-done" },
      { actionId: 24, status: "not-done" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 12. TEJAS  – Product  – Mentor: Adori
  // Enrolled: ~Jan 2025 | Mock Interview 1 scheduled 9 Mar
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "tejas",
    name: "Tejas",
    role: "Product",
    mentor: "Adori",
    currentStageId: "interview-prep",
    riskLevel: "normal",
    isAlumni: false,
    enrolledDate: "Jan 2026",
    notes:
      "Interview diagnosis form sent and done (22 Feb). Mock Interview 1 scheduled for 9 Mar. Short feedback call also scheduled for 9 Mar after the interview.",
    actions: [
      { actionId: 1,  status: "done" },
      { actionId: 2,  status: "done" },
      { actionId: 3,  status: "done" },
      { actionId: 4,  status: "done" },
      { actionId: 5,  status: "done" },
      { actionId: 6,  status: "done" },
      { actionId: 7,  status: "done" },
      { actionId: 8,  status: "done" },
      { actionId: 9,  status: "done" },
      { actionId: 10, status: "done" },
      { actionId: 11, status: "done" },
      { actionId: 12, status: "done" },
      { actionId: 13, status: "done" },
      { actionId: 14, status: "done" },
      { actionId: 15, status: "na" },
      { actionId: 16, status: "done" },
      { actionId: 17, status: "done",     date: "22 Feb" },
      { actionId: 18, status: "done" },
      { actionId: 19, status: "scheduled",date: "9 Mar",  comment: "Mock Interview 1 scheduled" },
      { actionId: 20, status: "scheduled",date: "9 Mar",  comment: "Feedback call scheduled post-interview" },
      { actionId: 21, status: "not-done" },
      { actionId: 22, status: "not-done" },
      { actionId: 23, status: "not-done" },
      { actionId: 24, status: "not-done" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 13. SANDEEP  – Role TBD  – Mentor: TBD
  // Enrolled: ~Feb 2025 | Very early – resume follow-up in progress
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: "sandeep",
    name: "Sandeep",
    role: "TBD",
    mentor: "TBD",
    currentStageId: "resume-building",
    riskLevel: "normal",
    isAlumni: false,
    enrolledDate: "Feb 2026",
    notes: "Very limited data in the OPS sheet. Resume follow-up done (23 Feb). Role and mentor to be confirmed. Monitor progress.",
    actions: [
      { actionId: 1,  status: "done" },
      { actionId: 2,  status: "done" },
      { actionId: 3,  status: "done" },
      { actionId: 4,  status: "done" },
      { actionId: 5,  status: "done" },
      { actionId: 6,  status: "done",     date: "23 Feb" },
      { actionId: 7,  status: "not-done" },
      { actionId: 8,  status: "not-done" },
      { actionId: 9,  status: "not-done" },
      { actionId: 10, status: "not-done" },
      { actionId: 11, status: "not-done" },
      { actionId: 12, status: "not-done" },
      { actionId: 13, status: "not-done" },
      { actionId: 14, status: "not-done" },
      { actionId: 15, status: "not-done" },
      { actionId: 16, status: "not-done" },
      { actionId: 17, status: "not-done" },
      { actionId: 18, status: "not-done" },
      { actionId: 19, status: "not-done" },
      { actionId: 20, status: "not-done" },
      { actionId: 21, status: "not-done" },
      { actionId: 22, status: "not-done" },
      { actionId: 23, status: "not-done" },
      { actionId: 24, status: "not-done" },
    ],
  },
] as unknown as Candidate[];

function migrateCandidateActions(actions: CandidateAction[]): CandidateAction[] {
  const legacyById = new Map<number, CandidateAction>();
  for (const a of actions) legacyById.set(a.actionId, a);

  const out: CandidateAction[] = [];

  // Keep 1-14 as-is.
  for (let id = 1; id <= 14; id += 1) {
    const a = legacyById.get(id);
    if (a) out.push(a);
  }

  const mapId = (from: number, to: number) => {
    const a = legacyById.get(from);
    if (a) out.push({ ...a, actionId: to });
  };

  // Old -> new mapping (preserve status/date/comment)
  mapId(15, 16);
  mapId(16, 15);
  mapId(17, 19);
  mapId(18, 20);
  mapId(19, 22);
  mapId(20, 23);
  mapId(21, 24);
  mapId(22, 25);
  mapId(23, 26);
  mapId(24, 27);

  // Add new actions (default not-done unless already present)
  const ensure = (id: number) => {
    if (out.some((x) => x.actionId === id)) return;
    out.push({ actionId: id, status: "not-done" });
  };
  ensure(17); // message templates shared
  ensure(18); // applications started
  ensure(21); // cheatsheet shared

  // Keep order aligned with current JOURNEY_ACTIONS
  out.sort((a, b) => a.actionId - b.actionId);
  return out;
}

function migrateCandidateStage(candidate: Candidate, migratedActions: CandidateAction[]): StageId {
  if (candidate.isAlumni) return "alumni";
  if (candidate.currentStageId !== ("interview-prep" as StageId)) return candidate.currentStageId;

  const byId = new Map(migratedActions.map((a) => [a.actionId, a]));
  const mock1 = byId.get(22);
  const mock2 = byId.get(24);

  if (mock2?.status === "done") return "mock-interview-3";
  if (mock1?.status === "done") return "mock-interview-2";
  return "mock-interview-1";
}

export const CANDIDATES: Candidate[] = CANDIDATES_LEGACY.map((c) => {
  const migratedActions = migrateCandidateActions(c.actions);
  const currentStageId = migrateCandidateStage(c, migratedActions);
  return { ...c, actions: migratedActions, currentStageId };
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getStageById(id: string): Stage | undefined {
  return STAGES.find((s) => s.id === id);
}

export function getActionById(id: number): JourneyAction | undefined {
  return JOURNEY_ACTIONS.find((a) => a.id === id);
}

/** Return up to 3 next pending/on-hold/scheduled actions for a candidate */
export function getNextActions(candidate: Candidate): JourneyAction[] {
  if (candidate.isAlumni) return [];
  const actionMap = new Map(candidate.actions.map((a) => [a.actionId, a]));
  return JOURNEY_ACTIONS.filter((action) => {
    const ca = actionMap.get(action.id);
    return (
      !ca ||
      ca.status === "not-done" ||
      ca.status === "on-hold" ||
      ca.status === "scheduled"
    );
  }).slice(0, 3);
}

/** Progress % = done / (total - na) */
export function getProgress(candidate: Candidate): number {
  const actionMap = new Map(candidate.actions.map((a) => [a.actionId, a]));
  let done = 0;
  let total = 0;
  for (const a of JOURNEY_ACTIONS) {
    const ca = actionMap.get(a.id);
    if (ca?.status === "na") continue;
    total++;
    if (ca?.status === "done") done++;
  }
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

/** First non-done action for a candidate (their exact current step) */
export function getCurrentAction(candidate: Candidate): JourneyAction | undefined {
  if (candidate.isAlumni) return undefined;
  const actionMap = new Map(candidate.actions.map((a) => [a.actionId, a]));
  return JOURNEY_ACTIONS.find((action) => {
    const ca = actionMap.get(action.id);
    return !ca || ca.status === "not-done" || ca.status === "on-hold" || ca.status === "scheduled";
  });
}

// ─── Message templates (before / after each action) ──────────────────────────
// Variables: {{name}}, {{mentor}}, {{role}}
export const MESSAGE_TEMPLATES: Record<number, { before?: string; after?: string }> = {
  1: {
    before: `Hey {{name}}! 👋 Welcome to Mentorque! 🎉\n\nYou've been added to your onboarding group. Here's what to do right now:\n\n1️⃣ Fill out the Tally form shared in the group (takes 5 mins)\n2️⃣ We'll schedule your onboarding call shortly\n\nSo excited to have you with us — let's get you placed! 🚀`,
    after:  `Hey {{name}}! Great connecting today. Here's a quick recap:\n\n✅ Added to the group\n✅ Tally form filled\n\n*Next step:* Your Onboarding Call is being scheduled. We'll share 2–3 slot options shortly! 📅`,
  },
  2: {
    before: `Hey {{name}}! 👋\n\nWe'd like to schedule your Onboarding Call (~30 mins) this week. We'll walk you through:\n• The Mentorque portal\n• AI extension setup\n• Your personalised roadmap\n\nPlease share 2–3 slots that work for you! 📅`,
    after:  `Hey {{name}}! Great connecting with you today. 🙌\n\n📋 *Onboarding Call — MOM*\n✅ Portal walkthrough — done\n✅ AI Extension explained\n✅ Roadmap shared\n\n*Next step:* We've shared the Resume Compiler in the group. Please go through it, use the prompt + reference CVs, and send us your first CV draft within 2–3 days! 💪`,
  },
  3: {
    before: `Hey {{name}}! 👋\n\nWe've shared the *Resume Compiler* in the group along with:\n📄 The resume structuring prompt\n📋 Reference CVs for {{role}} roles\n\nPlease use these to prepare your first structured CV draft and share the PDF back in the group. Take 2–3 days — no rush, but the sooner the better! 😊`,
  },
  4: {
    before: `Hey {{name}}! 👋 Quick check-in!\n\nHave you had a chance to work on your resume? 📄\n\nWhenever ready, please send the structured CV PDF in the group. We'll review it and schedule your Resume Revamp call straight away!\n\nLet us know if you need any help with the compiler. 😊`,
    after:  `Hey {{name}}! Thanks for sending your CV draft — received! 🙌\n\nWe'll review it and share feedback shortly. Stand by for your *Resume Revamp Call* details!`,
  },
  5: {
    before: `Hey {{name}}! 🎯\n\nReady to level up your resume! We'd like to schedule a *Resume Revamp Call* (~45 mins). We'll cover:\n• Resume writing fundamentals\n• Tailoring your CV for {{role}} roles\n• Structuring your experience and achievements\n\nPlease share 2–3 slots that work for you this week! 📅`,
    after:  `Hey {{name}}! Great session today! Here's your MOM 📋\n\n*Resume Revamp Call — Summary*\n✅ Resume structure covered\n✅ CV tailored for {{role}} roles\n✅ Key pointers noted\n\n*Your action items:*\n1. Incorporate all feedback from today\n2. Send us the updated resume draft within 2 days\n\nYou're doing brilliantly! 💪`,
  },
  6: {
    before: `Hey {{name}}! 👋 Quick follow-up!\n\nCould you please share the updated resume draft in the group? We'll review it and send refinement pointers straight away.\n\nNo rush, but do try to send it across soon! 😊`,
  },
  7: {
    before: `Hey {{name}}! We've reviewed your updated resume. Here are your refinement pointers:\n\n[Add pointers here]\n\nPlease incorporate these changes and send us the updated version. We typically do 2–3 iterations — you're almost there! 💪`,
    after:  `Hey {{name}}! Resume is looking great now! 🎉\n\nWe'll move to the next exciting step — your *First Mentor Call*. We'll introduce you to {{mentor}} shortly. Get ready! 🚀`,
  },
  8: {
    before: `Hey {{name}}! Exciting news — meet your Mentorque mentor, *{{mentor}}*! 🎉\n\nYour First Mentor Call is being scheduled (~60 mins). Here's what you'll cover:\n• Resume finalisation\n• Elevator pitch\n• Outreach and application strategy for {{role}} roles\n\n*To prepare:*\n• Bring your latest resume\n• Think about your career goals\n• Prepare 2–3 questions for {{mentor}}\n\nLooking forward to this! 🚀`,
    after:  `Hey {{name}}! Fantastic first session with {{mentor}} today! Here's your MOM 📋\n\n*First Mentor Call — Summary*\n✅ Resume reviewed and finalised\n✅ Elevator pitch drafted\n✅ Outreach strategy for {{role}} discussed\n\n*Your action items:*\n1. [Add specific items from the call]\n2. Start applying the outreach strategy discussed\n\nPlease reply with your feedback on the session. Projects Call is up next! 💪`,
  },
  9: {
    after:  `Hey {{name}}! Following up on your great session with {{mentor}}. Here's the full MOM:\n\n[Add MOM details here]\n\nPlease confirm receipt and share any feedback — we love hearing from you! 🙏`,
  },
  10: {
    before: `Hey {{name}} and {{mentor}}! 👋\n\nTime for the *Detailed Projects Call* (~45 mins)! We'll cover:\n• Review of {{name}}'s projects and experience\n• Identifying 2–3 strong projects for the portfolio\n• How to structure them for {{role}} roles\n\nPlease share your availability this week:\n• {{name}}:\n• {{mentor}}:\n\n📅 Let's get the portfolio started!`,
    after:  `Hey {{name}}! Great projects session with {{mentor}} today! Here's your MOM 📋\n\n*Projects Call — Summary*\n✅ Projects shortlisted\n✅ Portfolio strategy agreed\n\n*Your action items:*\n1. Build out the agreed projects\n2. Update your resume with the projects section\n3. Fill in the Projects Doc (shared in group)\n\nPortfolio stage — here we come! 🚀`,
  },
  11: {
    before: `Hey {{name}}! 👋\n\nWe've shared the *Projects Documentation* template in the group 📄\n\nPlease:\n1. Build out your chosen projects\n2. Fill in the Projects Doc template\n3. Update your resume with the new projects section\n4. Share back with us when done\n\nLet us know if you need help structuring any project! 💪`,
    after:  `Hey {{name}}! Projects doc received — well done! 🙌\n\nWe're reviewing the projects now and will schedule the Portfolio Finalisation Call shortly. Almost at the portfolio milestone! 🚀`,
  },
  12: {
    before: `Hey {{name}}! 🎯\n\nReady to finalise the portfolio! We'd like to schedule a *Portfolio Review Call* (~20 mins) to:\n• Review your completed projects\n• Final CV check\n• Confirm the portfolio presentation\n\nWhen are you free? Please share 2–3 slots! 📅`,
    after:  `Hey {{name}}! Portfolio review done — brilliant work! 🎉\n\n✅ Projects finalised\n✅ CV updated with portfolio\n✅ Presentation confirmed\n\nNext: AI Extension setup and official portfolio delivery! You're nearly there. 🚀`,
  },
  13: {
    before: `Hey {{name}}! 🎉\n\nTime for the *Portfolio Delivery Call* (~30 mins) where we'll:\n• Set up the AI Extension properly\n• Hand over your complete portfolio\n• Share final application tips\n\nWhen are you free? Please share 2–3 slots! 📅`,
    after:  `Hey {{name}}! Huge milestone — portfolio delivered! 🎉🎉\n\n📋 *Portfolio Delivery — Summary*\n✅ AI Extension configured and set up\n✅ Portfolio delivered\n✅ Application toolkit ready\n\nYou now have *everything* needed to land your {{role}} role!\n\nNext up: payment completion, then Outreach & LinkedIn strategy. Let's keep going! 🚀`,
  },
  14: {
    before: `Hey {{name}}! 👋\n\nAs discussed, here are the payment details for your Mentorque programme:\n\n[Add payment link/details here]\n\nPlease complete payment at your earliest convenience so we can move to the next phase of your journey. Feel free to reach out if you have any questions! 🙏`,
    after:  `Hey {{name}}! Payment confirmed — thank you! 🙌\n\nWe'll now move forward with your Outreach & LinkedIn strategy. Exciting phase ahead! 🚀`,
  },
  15: {
    before: `Hey {{name}}! 📅\n\nWe're scheduling your *Outreach Guidance Session* (~30 mins) to cover:\n• Job market overview for {{role}} roles\n• Target companies and platforms\n• Application strategy\n\nWhen works for you this week?`,
    after:  `Hey {{name}}! Great outreach session today! 💪\n\n📋 *Outreach Guidance — Summary*\n✅ Job market mapped for {{role}} roles\n✅ Target companies identified\n✅ Application strategy agreed\n\n*Your next steps:*\n1. [Add specific action items from session]\n\nNext: LinkedIn profile optimisation call! 🚀`,
  },
  16: {
    before: `Hey {{name}}! 📅\n\nWe'd like to schedule your *LinkedIn & Outreach Strategy Call* (~45 mins). We'll cover:\n• LinkedIn profile review and improvements\n• Outreach message templates\n• Application tracker setup\n• Target company list for {{role}} roles\n\nPlease share 2–3 slots that work for you!`,
    after:  `Hey {{name}}! Great session today! Here's your MOM 📋\n\n*LinkedIn & Outreach Strategy — Summary*\n✅ LinkedIn profile optimised\n✅ Outreach strategy agreed\n✅ Application tracker set up\n\n*Your action items:*\n1. Implement the LinkedIn changes we discussed\n2. Start outreach using the templates shared\n3. Apply to *minimum 5 relevant roles per day*\n4. Track every application in the tracker\n\nYou're in the final stretch — let's get you placed! 🚀`,
  },
  17: {
    before: `Hey {{name}}! 👋\n\nPlease fill in the *Interview Diagnosis Form* — it helps us understand your interview experience and tailor your mock interview prep:\n\n[Add form link here]\n\nShould take about 5 minutes. Please fill it in today if possible! 😊\n\nWe'll review your responses and share the next steps shortly.`,
    after:  `Hey {{name}}! Form received — thank you! 🙌\n\nWe'll review your interview diagnosis and schedule your first Mock Interview shortly. Get excited — you're almost at the finish line! 🚀`,
  },
  18: {
    before: `Hey {{name}} and {{mentor}}! 🎯\n\nTime to schedule *Mock Interview 1*! We've reviewed {{name}}'s interview diagnosis.\n\nHere's the plan (~45 mins total):\n• Quick review of diagnosis together\n• Full mock interview with {{mentor}}\n• Detailed feedback at the end\n\nPlease share your availability this week:\n• {{name}}:\n• {{mentor}}:\n\nLet's get interview-ready! 💪`,
    after:  `Hey {{name}}! Mock Interview 1 is confirmed with {{mentor}}! 🎯\n\n📋 *Pre-Interview Prep Checklist:*\n☐ Research the companies you're targeting\n☐ Review the STAR interview framework\n☐ Prepare 5–7 strong stories from your experience\n☐ Set up camera, lighting, and audio\n☐ Have your resume printed/open in front of you\n\nYou've prepared well — trust the process! 🚀`,
  },
  19: {
    before: `Hey {{name}}! 👋 Just a reminder — your *Mock Interview 1* with {{mentor}} is coming up!\n\n✅ STAR framework reviewed\n✅ Company research done\n✅ Camera and audio tested\n✅ Resume ready\n\nYou've got this — see you there! 💪`,
    after:  `Hey {{name}} and {{mentor}}! Thanks for the Mock Interview 1 session! 🙌\n\n📋 *Mock Interview 1 — MOM*\n\n*{{mentor}} — Interviewer Feedback:*\nStrengths:\nAreas to improve:\nScore /10:\n\n*{{name}} — Self-Feedback:*\nHow did it feel?\nWhat would you do differently next time?\n\nWe'll review this together and prep for Mock Interview 2. Keep going! 💪`,
  },
  20: {
    before: `Hey {{name}}! 👋\n\nWe'd like to schedule a quick *Feedback Call* (~20 mins) to:\n• Review Mock Interview 1 feedback\n• Check your application progress\n• Plan next steps\n\nWhen are you free? 📅`,
    after:  `Hey {{name}}! Great check-in today! 💪\n\n✅ Mock Interview 1 feedback reviewed\n✅ Application progress noted\n✅ Next steps agreed\n\n*Reminder:* Keep applying to at least 5 roles per day and tracking everything.\n\nMock Interview 2 with {{mentor}} is next — keep improving! 🚀`,
  },
  21: {
    before: `Hey {{name}}! 👋 *Mock Interview 2* with {{mentor}} is coming up!\n\n*Applying feedback from Mock Interview 1:*\n[Add specific improvement points from last session]\n\n✅ Worked on identified weak areas\n✅ New STAR stories prepared\n✅ Company research done\n✅ Setup tested\n\nLet's see the improvement — you've got this! 💪`,
    after:  `Hey {{name}} and {{mentor}}! Excellent Mock Interview 2 session! 🙌\n\n📋 *Mock Interview 2 — MOM*\n\n*Progress since Mock Interview 1:*\n[Note improvements]\n\n*{{mentor}} — Feedback:*\nStrengths:\nAreas to improve:\nScore /10:\n\n*{{name}} — Self-Feedback:*\n[Self-assessment]\n\nExcellent work — one more round and you'll be fully ready! 🚀`,
  },
  22: {
    before: `Hey {{name}}! 👋\n\nLet's do a quick *Feedback Call* (~20 mins):\n• Mock Interview 2 review\n• Application progress check\n• Prep for Mock Interview 3\n\nWhen are you free? 📅`,
    after:  `Hey {{name}}! Great session today! 💪\n\n✅ Mock Interview 2 feedback reviewed\n✅ Key improvements noted\n✅ Plan agreed for final push\n\nKeep applying, keep tracking. The offer is coming! 🚀`,
  },
  23: {
    before: `Hey {{name}}! 👋 *Final Mock Interview* with {{mentor}} coming up!\n\n*You've come so far:*\n✅ Mock Interview 1 — done & feedback applied\n✅ Mock Interview 2 — done & feedback applied\n✅ Now: putting it all together!\n\nFinal checklist:\n☐ Best STAR stories ready\n☐ Company research solid\n☐ Setup tested\n\nLet's finish strong! 💪`,
    after:  `Hey {{name}} and {{mentor}}! Outstanding Mock Interview 3 session! 🎉\n\n📋 *Mock Interview 3 — MOM*\n\n*{{mentor}} — Final Feedback:*\nOverall score /10:\nKey strengths:\nFinal pointers:\n\n*{{name}} — Reflection:*\n[Self-assessment]\n\nWell done on completing all three mock interviews — you are ready for the real thing! 🚀`,
  },
  24: {
    before: `Hey {{name}}! 👋\n\nLet's do a final *Feedback & Planning Call* (~20 mins):\n• Review Mock Interview 3\n• Final application strategy\n• Next steps to land the offer!\n\nWhen works for you? 📅`,
    after:  `Hey {{name}}! 🎉🎉 Congratulations on completing the full Mentorque programme!\n\nYou now have:\n✅ A polished, tailored resume\n✅ A strong project portfolio\n✅ An optimised LinkedIn profile\n✅ A proven outreach strategy\n✅ Interview skills sharpened through 3 mock interviews\n\n*Your final action plan:*\n• Apply to 5+ relevant roles every single day\n• Track every application\n• Call us IMMEDIATELY when you get an interview invite\n\nWe believe in you 100%. The entire Mentorque team is rooting for you every step of the way. You've got this! 💪🚀`,
  },
};

export const STAGE_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  "onboarding":         { bg: "bg-sky-500/10",     text: "text-sky-400",     border: "border-sky-500/25",     dot: "bg-sky-400" },
  "resume-building":    { bg: "bg-sky-500/10",     text: "text-sky-400",     border: "border-sky-500/25",     dot: "bg-sky-400" },
  "mentor-intro":       { bg: "bg-sky-500/10",     text: "text-sky-400",     border: "border-sky-500/25",     dot: "bg-sky-400" },
  "projects-portfolio": { bg: "bg-sky-500/10",     text: "text-sky-400",     border: "border-sky-500/25",     dot: "bg-sky-400" },
  "payment":            { bg: "bg-sky-500/10",     text: "text-sky-400",     border: "border-sky-500/25",     dot: "bg-sky-400" },
  "outreach":           { bg: "bg-sky-500/10",     text: "text-sky-400",     border: "border-sky-500/25",     dot: "bg-sky-400" },
  // Legacy id kept for safe fallbacks in UI lookups
  "interview-prep":     { bg: "bg-sky-500/10",     text: "text-sky-400",     border: "border-sky-500/25",     dot: "bg-sky-400" },
  "interview-diagnostics": { bg: "bg-sky-500/10", text: "text-sky-400", border: "border-sky-500/25", dot: "bg-sky-400" },
  "mock-interview-1":      { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/25", dot: "bg-violet-400" },
  "mock-interview-2":      { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/25", dot: "bg-violet-400" },
  "mock-interview-3":      { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/25", dot: "bg-violet-400" },
  "alumni":             { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/25", dot: "bg-emerald-400" },
};
