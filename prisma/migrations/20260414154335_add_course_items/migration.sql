-- CreateEnum
CREATE TYPE "CourseItemType" AS ENUM ('VIDEO', 'MATERIAL', 'ASSIGNMENT', 'QUIZ');

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "courseItemId" TEXT;

-- CreateTable
CREATE TABLE "CourseItem" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "CourseItemType" NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CourseItem" ADD CONSTRAINT "CourseItem_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_courseItemId_fkey" FOREIGN KEY ("courseItemId") REFERENCES "CourseItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
