import { eq } from "drizzle-orm";
import type { Db } from "../db/client.ts";
import {
  classes,
  classMembers,
  consents,
  dayPlans,
  dayUpdates,
  excursionAsks,
  guardianLinks,
  posts,
  privacyPrefs,
  schools,
  users,
} from "../db/schema.ts";
import { SEED } from "./ids.ts";

export { SEED };

export async function seedPinheiros(db: Db, now: number): Promise<void> {
  const existing = await db
    .select()
    .from(schools)
    .where(eq(schools.id, SEED.schoolId))
    .limit(1);
  if (existing[0]) {
    try {
      await seedPinheirosExtras(db, now);
    } catch {
      // Extra tables may still be applying on a live D1.
    }
    return;
  }

  try {
    await db
      .insert(schools)
      .values({
        id: SEED.schoolId,
        name: "Pinheiros",
        slug: "pinheiros",
        locale: "pt-PT",
        timezone: "Europe/Lisbon",
        createdAt: now,
      })
      .onConflictDoNothing();

    await db
      .insert(users)
      .values([
        {
          id: SEED.teacherId,
          schoolId: SEED.schoolId,
          role: "teacher",
          email: SEED.teacherEmail,
          emailVerifiedAt: now,
          displayName: "Ana Costa",
          firstName: "Ana",
          lastInitial: "C",
          avatarSeed: "teacher-ana",
          locale: "pt-PT",
          createdAt: now,
        },
        {
          id: SEED.parentId,
          schoolId: SEED.schoolId,
          role: "guardian",
          email: SEED.parentEmail,
          emailVerifiedAt: now,
          displayName: "Rui Mendes",
          firstName: "Rui",
          lastInitial: "M",
          avatarSeed: "parent-rui",
          locale: "pt-PT",
          createdAt: now,
        },
        {
          id: SEED.childOakId,
          schoolId: SEED.schoolId,
          role: "student",
          email: null,
          displayName: "Oak P.",
          firstName: "Oak",
          lastInitial: "P",
          avatarSeed: "oak",
          locale: "pt-PT",
          createdAt: now,
        },
        {
          id: SEED.childRiverId,
          schoolId: SEED.schoolId,
          role: "student",
          email: null,
          displayName: "River R.",
          firstName: "River",
          lastInitial: "R",
          avatarSeed: "river",
          locale: "pt-PT",
          createdAt: now,
        },
        {
          id: SEED.childCedarId,
          schoolId: SEED.schoolId,
          role: "student",
          email: null,
          displayName: "Cedar M.",
          firstName: "Cedar",
          lastInitial: "M",
          avatarSeed: "cedar",
          locale: "pt-PT",
          createdAt: now,
        },
      ])
      .onConflictDoNothing();

    await db
      .insert(classes)
      .values({
        id: SEED.classId,
        schoolId: SEED.schoolId,
        name: "4.o B",
        gradeLevel: "4",
        inviteCode: SEED.inviteCode,
        commentsEnabled: 1,
        createdAt: now,
      })
      .onConflictDoNothing();

    await db
      .insert(classMembers)
      .values([
        {
          id: "mem_teacher",
          classId: SEED.classId,
          userId: SEED.teacherId,
          role: "teacher",
          status: "active",
          joinedAt: now,
        },
        {
          id: "mem_oak",
          classId: SEED.classId,
          userId: SEED.childOakId,
          role: "student",
          status: "active",
          joinedAt: now,
        },
        {
          id: "mem_river",
          classId: SEED.classId,
          userId: SEED.childRiverId,
          role: "student",
          status: "active",
          joinedAt: now,
        },
        {
          id: "mem_cedar",
          classId: SEED.classId,
          userId: SEED.childCedarId,
          role: "student",
          status: "active",
          joinedAt: now,
        },
      ])
      .onConflictDoNothing();

    await db
      .insert(guardianLinks)
      .values({
        id: "gl_oak",
        guardianId: SEED.parentId,
        studentId: SEED.childOakId,
        relationship: "parent",
        createdAt: now,
      })
      .onConflictDoNothing();

    await db
      .insert(consents)
      .values({
        id: "con_oak_media",
        studentId: SEED.childOakId,
        guardianId: SEED.parentId,
        schoolId: SEED.schoolId,
        type: "media_story",
        granted: 1,
        source: "guardian",
        recordedAt: now,
      })
      .onConflictDoNothing();

    await db
      .insert(privacyPrefs)
      .values({
        userId: SEED.parentId,
        photoOptOut: 0,
        yolo: 0,
        updatedAt: now,
      })
      .onConflictDoNothing();

    await db
      .insert(posts)
      .values([
        {
          id: "post_garden",
          classId: SEED.classId,
          authorId: SEED.teacherId,
          type: "story",
          title: "Garden morning",
          body: "We planted herbs and watered the boxes. The class sang while they worked.",
          childIds: null,
          pinned: 1,
          allowComments: 1,
          createdAt: now - 60 * 60 * 1000,
          updatedAt: now - 60 * 60 * 1000,
        },
        {
          id: "post_oak",
          classId: SEED.classId,
          authorId: SEED.teacherId,
          type: "story",
          title: "Reading corner",
          body: "Oak P. read the weather chart to the group. Quiet, clear, and kind.",
          childIds: JSON.stringify([SEED.childOakId]),
          pinned: 0,
          allowComments: 1,
          createdAt: now - 30 * 60 * 1000,
          updatedAt: now - 30 * 60 * 1000,
        },
        {
          id: "post_assembly",
          classId: SEED.classId,
          authorId: SEED.teacherId,
          type: "announcement",
          title: "Friday assembly",
          body: "Short assembly on Friday morning. Thumbs up when you have read this.",
          childIds: null,
          pinned: 0,
          allowComments: 0,
          createdAt: now - 10 * 60 * 1000,
          updatedAt: now - 10 * 60 * 1000,
        },
      ])
      .onConflictDoNothing();

    await db
      .insert(dayPlans)
      .values({
        id: "plan_standing",
        classId: SEED.classId,
        day: "standing",
        happening:
          "Garden visit after snack. If it rains we stay in the art room.",
        bring: "Hat, water bottle, and a change of socks.",
        updatedBy: SEED.teacherId,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();

    await db
      .insert(dayUpdates)
      .values({
        id: "upd_road",
        classId: SEED.classId,
        day: "standing",
        body: "The road by the gate is closed. Leave ten minutes early.",
        createdBy: SEED.teacherId,
        createdAt: now,
      })
      .onConflictDoNothing();
    await seedPinheirosExtras(db, now);
  } catch {
    const again = await db
      .select()
      .from(schools)
      .where(eq(schools.id, SEED.schoolId))
      .limit(1);
    if (again[0]) {
      return;
    }
    throw new Error("pinheiros seed failed");
  }
}

async function seedPinheirosExtras(db: Db, now: number): Promise<void> {
  await db
    .insert(posts)
    .values([
      {
        id: "post_music",
        classId: SEED.classId,
        authorId: SEED.teacherId,
        type: "story",
        title: "Music circle",
        body: "River R. kept a quiet beat on a wood block. The class listened.",
        childIds: JSON.stringify([SEED.childRiverId]),
        pinned: 0,
        allowComments: 1,
        createdAt: now - 8 * 60 * 1000,
        updatedAt: now - 8 * 60 * 1000,
      },
      {
        id: "post_boxes",
        classId: SEED.classId,
        authorId: SEED.teacherId,
        type: "photo",
        title: "Garden boxes",
        body: "Garden boxes after watering. Caption only. No faces close up.",
        childIds: null,
        pinned: 0,
        allowComments: 1,
        createdAt: now - 4 * 60 * 1000,
        updatedAt: now - 4 * 60 * 1000,
      },
      {
        id: "post_voice",
        classId: SEED.classId,
        authorId: SEED.teacherId,
        type: "voice",
        title: "Garden listen",
        body: "We stood still and heard the water on the boxes.",
        childIds: null,
        pinned: 0,
        allowComments: 1,
        createdAt: now - 2 * 60 * 1000,
        updatedAt: now - 2 * 60 * 1000,
      },
    ])
    .onConflictDoNothing();
  await db
    .insert(dayUpdates)
    .values({
      id: "upd_library",
      classId: SEED.classId,
      day: "standing",
      body: "Thursday: bring the library bag.",
      createdBy: SEED.teacherId,
      createdAt: now - 60 * 1000,
    })
    .onConflictDoNothing();
  await db
    .insert(excursionAsks)
    .values({
      id: "exc_garden",
      classId: SEED.classId,
      day: "standing",
      title: "Garden visit after snack. One tap if your child may go.",
      createdAt: now,
    })
    .onConflictDoNothing();
}
