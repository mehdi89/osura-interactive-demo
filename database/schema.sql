-- Generated from public/schemas/workspace.schema.json. Do not edit.
-- Synthetic prototype reference, not a production migration or authorization model.
BEGIN;
CREATE TABLE "workspaces" (
  "id" text PRIMARY KEY CHECK ("id" ~ '^[A-Za-z0-9][A-Za-z0-9_-]*$'),
  "name" text NOT NULL CHECK (length("name") >= 1 AND "name" ~ '\S')
);
CREATE TABLE "actors" (
  "id" text PRIMARY KEY CHECK ("id" ~ '^[A-Za-z0-9][A-Za-z0-9_-]*$'),
  "name" text NOT NULL CHECK (length("name") >= 1 AND "name" ~ '\S')
);
CREATE TABLE "policyVersions" (
  "id" text PRIMARY KEY CHECK ("id" ~ '^[A-Za-z0-9][A-Za-z0-9_-]*$'),
  "name" text NOT NULL CHECK (length("name") >= 1 AND "name" ~ '\S'),
  "kind" text NOT NULL CHECK ("kind" IN ('core', 'plan', 'overlay')),
  "version" integer NOT NULL CHECK ("version" >= 1)
);
CREATE TABLE "suppliers" (
  "id" text PRIMARY KEY CHECK ("id" ~ '^[A-Za-z0-9][A-Za-z0-9_-]*$'),
  "name" text NOT NULL CHECK (length("name") >= 1 AND "name" ~ '\S'),
  "domain" text,
  "country" text,
  "intakeEnabled" boolean NOT NULL
);
CREATE TABLE "services" (
  "id" text PRIMARY KEY CHECK ("id" ~ '^[A-Za-z0-9][A-Za-z0-9_-]*$'),
  "supplierId" text NOT NULL CHECK (length("supplierId") >= 1 AND "supplierId" ~ '\S'),
  "name" text NOT NULL CHECK (length("name") >= 1 AND "name" ~ '\S'),
  "suggestionOrder" integer CHECK ("suggestionOrder" >= 1),
  UNIQUE ("supplierId", "name")
);
CREATE TABLE "engagements" (
  "id" text PRIMARY KEY CHECK ("id" ~ '^[A-Za-z0-9][A-Za-z0-9_-]*$'),
  "workspaceId" text NOT NULL CHECK (length("workspaceId") >= 1 AND "workspaceId" ~ '\S'),
  "serviceId" text NOT NULL CHECK (length("serviceId") >= 1 AND "serviceId" ~ '\S'),
  "ownerId" text NOT NULL CHECK (length("ownerId") >= 1 AND "ownerId" ~ '\S'),
  "risk" text NOT NULL CHECK ("risk" IN ('Critical', 'High', 'Medium', 'Low', 'Pending triage')),
  "riskBasis" text NOT NULL CHECK ("riskBasis" IN ('synthetic-fixture', 'awaiting-triage')),
  "stage" text NOT NULL CHECK ("stage" IN ('Decision', 'Evidence', 'Findings', 'Active', 'Questions', 'Awaiting triage', 'Rejected')),
  "due" date NOT NULL,
  "planVersionId" text NOT NULL CHECK (length("planVersionId") >= 1 AND "planVersionId" ~ '\S'),
  "corePolicyVersionId" text NOT NULL CHECK (length("corePolicyVersionId") >= 1 AND "corePolicyVersionId" ~ '\S'),
  "overlayVersionId" text,
  "analystId" text,
  "qaReviewerId" text,
  "decisionOwnerId" text,
  CHECK ("analystId" IS NULL OR "qaReviewerId" IS NULL OR "analystId" <> "qaReviewerId")
);
CREATE TABLE "requirements" (
  "id" text PRIMARY KEY CHECK ("id" ~ '^[A-Za-z0-9][A-Za-z0-9_-]*$'),
  "policyVersionId" text NOT NULL CHECK (length("policyVersionId") >= 1 AND "policyVersionId" ~ '\S'),
  "family" text NOT NULL CHECK (length("family") >= 1 AND "family" ~ '\S'),
  "name" text NOT NULL CHECK (length("name") >= 1 AND "name" ~ '\S'),
  "expectation" text NOT NULL CHECK (length("expectation") >= 1 AND "expectation" ~ '\S')
);
CREATE TABLE "requirementReviews" (
  "id" text PRIMARY KEY CHECK ("id" ~ '^[A-Za-z0-9][A-Za-z0-9_-]*$'),
  "engagementId" text NOT NULL CHECK (length("engagementId") >= 1 AND "engagementId" ~ '\S'),
  "requirementId" text NOT NULL CHECK (length("requirementId") >= 1 AND "requirementId" ~ '\S'),
  "conclusion" text NOT NULL CHECK ("conclusion" IN ('Supported', 'Partially supported', 'Unknown', 'Contradictory', 'Out of scope', 'Needs review')),
  "sourceLabel" text NOT NULL CHECK (length("sourceLabel") >= 1 AND "sourceLabel" ~ '\S'),
  "next" text NOT NULL CHECK (length("next") >= 1 AND "next" ~ '\S'),
  "passage" text NOT NULL CHECK (length("passage") >= 1 AND "passage" ~ '\S'),
  "proves" text NOT NULL CHECK (length("proves") >= 1 AND "proves" ~ '\S'),
  "doesNotProve" text NOT NULL CHECK (length("doesNotProve") >= 1 AND "doesNotProve" ~ '\S'),
  "preparedProposal" text NOT NULL CHECK (length("preparedProposal") >= 1 AND "preparedProposal" ~ '\S'),
  UNIQUE ("engagementId", "requirementId")
);
CREATE TABLE "documentVersions" (
  "id" text PRIMARY KEY CHECK ("id" ~ '^[A-Za-z0-9][A-Za-z0-9_-]*$'),
  "engagementId" text NOT NULL CHECK (length("engagementId") >= 1 AND "engagementId" ~ '\S'),
  "requirementId" text NOT NULL CHECK (length("requirementId") >= 1 AND "requirementId" ~ '\S'),
  "documentKey" text NOT NULL CHECK (length("documentKey") >= 1 AND "documentKey" ~ '\S'),
  "fileName" text NOT NULL CHECK (length("fileName") >= 1 AND "fileName" ~ '\S'),
  "status" text NOT NULL CHECK ("status" IN ('Received', 'Needs review', 'Verified', 'Reviewed')),
  "version" integer NOT NULL CHECK ("version" >= 1),
  "page" integer NOT NULL CHECK ("page" >= 1),
  "pageCount" integer NOT NULL CHECK ("pageCount" >= 1),
  "receivedOn" date NOT NULL,
  UNIQUE ("engagementId", "documentKey", "version"),
  CHECK ("page" <= "pageCount")
);
CREATE TABLE "evidenceCitations" (
  "id" text PRIMARY KEY CHECK ("id" ~ '^[A-Za-z0-9][A-Za-z0-9_-]*$'),
  "reviewId" text NOT NULL CHECK (length("reviewId") >= 1 AND "reviewId" ~ '\S'),
  "documentVersionId" text NOT NULL CHECK (length("documentVersionId") >= 1 AND "documentVersionId" ~ '\S'),
  "pageStart" integer NOT NULL CHECK ("pageStart" >= 1),
  "pageEnd" integer NOT NULL CHECK ("pageEnd" >= 1),
  "excerpt" text,
  CHECK ("pageStart" <= "pageEnd")
);
CREATE TABLE "findings" (
  "id" text PRIMARY KEY CHECK ("id" ~ '^[A-Za-z0-9][A-Za-z0-9_-]*$'),
  "engagementId" text NOT NULL CHECK (length("engagementId") >= 1 AND "engagementId" ~ '\S'),
  "requirementId" text NOT NULL CHECK (length("requirementId") >= 1 AND "requirementId" ~ '\S'),
  "issue" text NOT NULL CHECK (length("issue") >= 1 AND "issue" ~ '\S'),
  "severity" text NOT NULL CHECK ("severity" IN ('Critical', 'High', 'Medium', 'Low')),
  "ownerId" text NOT NULL CHECK (length("ownerId") >= 1 AND "ownerId" ~ '\S'),
  "state" text NOT NULL CHECK ("state" IN ('Open condition', 'Awaiting evidence', 'In remediation', 'Closed')),
  "due" date NOT NULL,
  "evidence" text NOT NULL CHECK (length("evidence") >= 1 AND "evidence" ~ '\S')
);
CREATE TABLE "triageQuestions" (
  "id" text PRIMARY KEY CHECK ("id" ~ '^[A-Za-z0-9][A-Za-z0-9_-]*$'),
  "policyVersionId" text NOT NULL CHECK (length("policyVersionId") >= 1 AND "policyVersionId" ~ '\S'),
  "label" text NOT NULL CHECK (length("label") >= 1 AND "label" ~ '\S')
);
CREATE TABLE "triageAnswers" (
  "id" text PRIMARY KEY CHECK ("id" ~ '^[A-Za-z0-9][A-Za-z0-9_-]*$'),
  "engagementId" text NOT NULL CHECK (length("engagementId") >= 1 AND "engagementId" ~ '\S'),
  "questionId" text NOT NULL CHECK (length("questionId") >= 1 AND "questionId" ~ '\S'),
  "value" boolean NOT NULL,
  UNIQUE ("engagementId", "questionId")
);
CREATE TABLE "biaQuestions" (
  "id" text PRIMARY KEY CHECK ("id" ~ '^[A-Za-z0-9][A-Za-z0-9_-]*$'),
  "policyVersionId" text NOT NULL CHECK (length("policyVersionId") >= 1 AND "policyVersionId" ~ '\S'),
  "dimension" text NOT NULL CHECK ("dimension" IN ('Confidentiality', 'Integrity', 'Availability')),
  "label" text NOT NULL CHECK (length("label") >= 1 AND "label" ~ '\S'),
  "canonicalCode" text
);
CREATE TABLE "biaAnswers" (
  "id" text PRIMARY KEY CHECK ("id" ~ '^[A-Za-z0-9][A-Za-z0-9_-]*$'),
  "engagementId" text NOT NULL CHECK (length("engagementId") >= 1 AND "engagementId" ~ '\S'),
  "questionId" text NOT NULL CHECK (length("questionId") >= 1 AND "questionId" ~ '\S'),
  "impact" text NOT NULL CHECK ("impact" IN ('Low', 'Medium', 'High')),
  UNIQUE ("engagementId", "questionId")
);
CREATE TABLE "supplierRequests" (
  "id" text PRIMARY KEY CHECK ("id" ~ '^[A-Za-z0-9][A-Za-z0-9_-]*$'),
  "engagementId" text NOT NULL CHECK (length("engagementId") >= 1 AND "engagementId" ~ '\S'),
  "recipient" text NOT NULL,
  "due" date NOT NULL,
  "message" text NOT NULL CHECK (length("message") >= 1 AND "message" ~ '\S'),
  "status" text NOT NULL CHECK ("status" IN ('Draft', 'Queued locally', 'Response received'))
);
CREATE TABLE "requestItems" (
  "id" text PRIMARY KEY CHECK ("id" ~ '^[A-Za-z0-9][A-Za-z0-9_-]*$'),
  "requestId" text NOT NULL CHECK (length("requestId") >= 1 AND "requestId" ~ '\S'),
  "requirementId" text NOT NULL CHECK (length("requirementId") >= 1 AND "requirementId" ~ '\S'),
  "label" text NOT NULL CHECK (length("label") >= 1 AND "label" ~ '\S'),
  "position" integer NOT NULL CHECK ("position" >= 1),
  UNIQUE ("requestId", "position")
);
ALTER TABLE "services" ADD FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE RESTRICT;
ALTER TABLE "engagements" ADD FOREIGN KEY ("workspaceId") REFERENCES "workspaces" ("id") ON DELETE RESTRICT;
ALTER TABLE "engagements" ADD FOREIGN KEY ("serviceId") REFERENCES "services" ("id") ON DELETE RESTRICT;
ALTER TABLE "engagements" ADD FOREIGN KEY ("ownerId") REFERENCES "actors" ("id") ON DELETE RESTRICT;
ALTER TABLE "engagements" ADD FOREIGN KEY ("planVersionId") REFERENCES "policyVersions" ("id") ON DELETE RESTRICT;
ALTER TABLE "engagements" ADD FOREIGN KEY ("corePolicyVersionId") REFERENCES "policyVersions" ("id") ON DELETE RESTRICT;
ALTER TABLE "engagements" ADD FOREIGN KEY ("overlayVersionId") REFERENCES "policyVersions" ("id") ON DELETE RESTRICT;
ALTER TABLE "engagements" ADD FOREIGN KEY ("analystId") REFERENCES "actors" ("id") ON DELETE RESTRICT;
ALTER TABLE "engagements" ADD FOREIGN KEY ("qaReviewerId") REFERENCES "actors" ("id") ON DELETE RESTRICT;
ALTER TABLE "engagements" ADD FOREIGN KEY ("decisionOwnerId") REFERENCES "actors" ("id") ON DELETE RESTRICT;
ALTER TABLE "requirements" ADD FOREIGN KEY ("policyVersionId") REFERENCES "policyVersions" ("id") ON DELETE RESTRICT;
ALTER TABLE "requirementReviews" ADD FOREIGN KEY ("engagementId") REFERENCES "engagements" ("id") ON DELETE RESTRICT;
ALTER TABLE "requirementReviews" ADD FOREIGN KEY ("requirementId") REFERENCES "requirements" ("id") ON DELETE RESTRICT;
ALTER TABLE "documentVersions" ADD FOREIGN KEY ("engagementId") REFERENCES "engagements" ("id") ON DELETE RESTRICT;
ALTER TABLE "documentVersions" ADD FOREIGN KEY ("requirementId") REFERENCES "requirements" ("id") ON DELETE RESTRICT;
ALTER TABLE "evidenceCitations" ADD FOREIGN KEY ("reviewId") REFERENCES "requirementReviews" ("id") ON DELETE RESTRICT;
ALTER TABLE "evidenceCitations" ADD FOREIGN KEY ("documentVersionId") REFERENCES "documentVersions" ("id") ON DELETE RESTRICT;
ALTER TABLE "findings" ADD FOREIGN KEY ("engagementId") REFERENCES "engagements" ("id") ON DELETE RESTRICT;
ALTER TABLE "findings" ADD FOREIGN KEY ("requirementId") REFERENCES "requirements" ("id") ON DELETE RESTRICT;
ALTER TABLE "findings" ADD FOREIGN KEY ("ownerId") REFERENCES "actors" ("id") ON DELETE RESTRICT;
ALTER TABLE "triageQuestions" ADD FOREIGN KEY ("policyVersionId") REFERENCES "policyVersions" ("id") ON DELETE RESTRICT;
ALTER TABLE "triageAnswers" ADD FOREIGN KEY ("engagementId") REFERENCES "engagements" ("id") ON DELETE RESTRICT;
ALTER TABLE "triageAnswers" ADD FOREIGN KEY ("questionId") REFERENCES "triageQuestions" ("id") ON DELETE RESTRICT;
ALTER TABLE "biaQuestions" ADD FOREIGN KEY ("policyVersionId") REFERENCES "policyVersions" ("id") ON DELETE RESTRICT;
ALTER TABLE "biaAnswers" ADD FOREIGN KEY ("engagementId") REFERENCES "engagements" ("id") ON DELETE RESTRICT;
ALTER TABLE "biaAnswers" ADD FOREIGN KEY ("questionId") REFERENCES "biaQuestions" ("id") ON DELETE RESTRICT;
ALTER TABLE "supplierRequests" ADD FOREIGN KEY ("engagementId") REFERENCES "engagements" ("id") ON DELETE RESTRICT;
ALTER TABLE "requestItems" ADD FOREIGN KEY ("requestId") REFERENCES "supplierRequests" ("id") ON DELETE RESTRICT;
ALTER TABLE "requestItems" ADD FOREIGN KEY ("requirementId") REFERENCES "requirements" ("id") ON DELETE RESTRICT;
COMMIT;
