-- CreateTable
CREATE TABLE "completion_reports" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "workDescription" TEXT NOT NULL,
    "actualStart" TIMESTAMP(3) NOT NULL,
    "actualEnd" TIMESTAMP(3) NOT NULL,
    "totalHours" DOUBLE PRECISION NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerSignature" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "completion_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "completion_reports_jobId_key" ON "completion_reports"("jobId");

-- AddForeignKey
ALTER TABLE "completion_reports" ADD CONSTRAINT "completion_reports_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "completion_reports" ADD CONSTRAINT "completion_reports_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
