import { afterEach, beforeEach, describe, expect, it } from "@rbxts/jest-globals";
import { endStages, getStages, initialize, stage } from "../lib/index";
import { Workspace } from "@rbxts/services";

describe("stage Allocator", () => {
	afterEach(() => {
		endStages();
	});

	describe("get stages", () => {
		it("should return empty array when no stages exist", () => {
			const stages = getStages();
			expect(stages.size()).toEqual(0);
		});

		it("should return all active stages", () => {
			new stage();
			new stage();
			const stage1 = new stage();

			stage1.end();

			expect(getStages().size()).toEqual(2);
		});
	});

	describe("end stages", () => {
		it("should remove all stages from allocator", () => {
			new stage();
			new stage();

			endStages();

			expect(getStages().size()).toEqual(0);
		});

		it("should end all stages properly", () => {
			const stage1 = new stage();

			const part = new Instance("Part");

			stage1.add(part);

			endStages();

			expect(part.Parent).toBeNil();
			expect(stage1.isActive).toBeFalsy();
		});
	});

	describe("initialize", () => {
		afterEach(() => {
			initialize(new Vector3(0, 0, 1000), new Vector3(10000, 10000, 10000));
		});

		it("should set gap properly", () => {
			initialize(new Vector3(0, 10, 0));

			const originStage = new stage();
			const stage1 = new stage();

			expect(stage1.worldPosition).toEqual(originStage.worldPosition.add(new Vector3(0, 10, 0)));
		});

		it("should set origin properly", () => {
			initialize(undefined, new Vector3(0, 0, 1));

			const originStage = new stage();

			expect(originStage.worldPosition).toEqual(new Vector3(0, 0, 1));
		});

		it("should set origin and gap properly", () => {
			initialize(new Vector3(0, 10, 0), new Vector3(0, 0, 1));

			const originStage = new stage();
			const stage1 = new stage();

			expect(originStage.worldPosition).toEqual(new Vector3(0, 0, 1));
			expect(stage1.worldPosition).toEqual(originStage.worldPosition.add(new Vector3(0, 10, 0)));
		});
	});

	describe("stage", () => {
		describe("constructor", () => {
			it("should create a new stage at the origin", () => {
				const stage1 = new stage();

				expect(stage1.isActive).toBeTruthy();
				expect(stage1.worldPosition).toEqual(new Vector3(10000, 10000, 10000));
			});

			it("it should generate a unique id", () => {
				const stage1 = new stage();
				const stage2 = new stage();

				expect(stage1.id).never.toBe(stage2.id);
			});

			it("should set a timestamp", () => {
				const beforeTime = os.clock();
				const testStage = new stage();
				const afterTime = os.clock();

				expect(testStage.createdAt).toBeGreaterThanOrEqual(beforeTime);
				expect(testStage.createdAt).toBeLessThanOrEqual(afterTime);
			});

			it("should allocate multiple stages with incremented positions", () => {
				const stage1 = new stage();
				const stage2 = new stage();
				const stage3 = new stage();

				expect(stage1.worldPosition).toEqual(new Vector3(10000, 10000, 10000));
				expect(stage2.worldPosition).toEqual(new Vector3(10000, 10000, 11000));
				expect(stage3.worldPosition).toEqual(new Vector3(10000, 10000, 12000));
			});

			it("should reuse deallocated positions", () => {
				const stage1 = new stage();
				const pos1 = stage1.worldPosition;

				stage1.destroy();

				const stage2 = new stage();
				expect(stage2.worldPosition).toEqual(pos1);

				stage2.destroy();
			});
		});

		describe("add", () => {
			it("should add instance to cleanup array", () => {
				const testStage = new stage();
				const part = new Instance("Part");

				testStage.add(part);

				const objects = testStage.getObjects();
				expect(objects).toContain(part);
			});

			it("should position BasePart with relative position", () => {
				const testStage = new stage();
				const part = new Instance("Part") as BasePart;
				const relativePos = new Vector3(10, 20, 30);

				testStage.add(part, relativePos);

				expect(part.Position).toEqual(testStage.worldPosition.add(relativePos));
			});

			it("should position Model with relative position using PivotTo", () => {
				const testStage = new stage();
				const model = new Instance("Model") as Model;
				const relativePos = new Vector3(5, 10, 15);

				testStage.add(model, relativePos);

				const expectedCFrame = new CFrame(testStage.worldPosition.add(relativePos));
				expect(model.GetPivot().Position).toEqual(expectedCFrame.Position);
			});

			it("should not position non-BasePart/Model instances", () => {
				const testStage = new stage();
				const folder = new Instance("Folder");
				const relativePos = new Vector3(10, 20, 30);

				expect(() => testStage.add(folder, relativePos)).never.toThrow();
			});

			it("should handle add without relative position", () => {
				const testStage = new stage();
				const part = new Instance("Part") as BasePart;
				const originalPos = part.Position;

				testStage.add(part);

				expect(part.Position).toEqual(originalPos);

				testStage.destroy();
			});

			it("should add multiple instances", () => {
				const testStage = new stage();
				const part1 = new Instance("Part");
				const part2 = new Instance("Part");
				const part3 = new Instance("Part");

				testStage.add(part1);
				testStage.add(part2);
				testStage.add(part3);

				const objects = testStage.getObjects();
				expect(objects.size()).toBe(3);
			});
		});

		describe("remove", () => {
			it("should remove instance from cleanup array", () => {
				const testStage = new stage();
				const part = new Instance("Part");

				testStage.add(part);
				expect(testStage.getObjects()).toContain(part);

				testStage.remove(part);
				expect(testStage.getObjects()).never.toContain(part);

				part.Destroy();
			});

			it("should not destroy removed instance", () => {
				const testStage = new stage();
				const part = new Instance("Part");
				part.Parent = Workspace;

				testStage.add(part);
				testStage.remove(part);
				testStage.destroy();

				expect(part.Parent).toBeDefined();

				part.Destroy();
			});

			it("should handle removing non-existent instance", () => {
				const testStage = new stage();
				const part = new Instance("Part");

				expect(() => testStage.remove(part)).never.toThrow();

				part.Destroy();
			});

			it("should handle removing same instance twice", () => {
				const testStage = new stage();
				const part = new Instance("Part");

				testStage.add(part);
				testStage.remove(part);

				expect(() => testStage.remove(part)).never.toThrow();

				part.Destroy();
			});
		});

		describe("setParent", () => {
			it("should parent all tracked instances", () => {
				const testStage = new stage();
				const folder = new Instance("Folder");
				const part1 = new Instance("Part");
				const part2 = new Instance("Part");

				testStage.add(part1);
				testStage.add(part2);

				testStage.setParent(folder);

				expect(part1.Parent).toBe(folder);
				expect(part2.Parent).toBe(folder);

				folder.Destroy();
				part1.Destroy();
				part2.Destroy();
			});

			it("should work with empty stage", () => {
				const testStage = new stage();
				const folder = new Instance("Folder");

				expect(() => testStage.setParent(folder)).never.toThrow();

				folder.Destroy();
			});
		});

		describe("clear", () => {
			it("should destroy all tracked instances", () => {
				const testStage = new stage();
				const part1 = new Instance("Part");
				const part2 = new Instance("Part");

				testStage.add(part1);
				testStage.add(part2);

				testStage.clear();

				expect(part1.Parent).toBeNil();
				expect(part2.Parent).toBeNil();
			});

			it("should empty cleanup array", () => {
				const testStage = new stage();
				const part = new Instance("Part");

				testStage.add(part);
				testStage.clear();

				expect(testStage.getObjects().size()).toBe(0);
			});

			it("should allow adding new instances after clear", () => {
				const testStage = new stage();
				const part1 = new Instance("Part");
				const part2 = new Instance("Part");

				testStage.add(part1);
				testStage.clear();
				testStage.add(part2);

				expect(testStage.getObjects().size()).toBe(1);
				expect(testStage.getObjects()).toContain(part2);

				part2.Destroy();
			});
		});

		describe("getObjects", () => {
			it("should return empty array for new stage", () => {
				const testStage = new stage();

				expect(testStage.getObjects().size()).toBe(0);
			});

			it("should return all tracked instances", () => {
				const testStage = new stage();
				const part1 = new Instance("Part");
				const part2 = new Instance("Part");
				const part3 = new Instance("Part");

				testStage.add(part1);
				testStage.add(part2);
				testStage.add(part3);

				const objects = testStage.getObjects();

				expect(objects.size()).toBe(3);
				expect(objects).toContain(part1);
				expect(objects).toContain(part2);
				expect(objects).toContain(part3);
			});

			it("should reflect changes after remove", () => {
				const testStage = new stage();
				const part1 = new Instance("Part");
				const part2 = new Instance("Part");

				testStage.add(part1);
				testStage.add(part2);
				testStage.remove(part1);

				const objects = testStage.getObjects();

				expect(objects.size()).toBe(1);
				expect(objects).toContain(part2);

				part1.Destroy();
				testStage.destroy();
			});
		});

		describe("Ended", () => {
			it("should register callback", () => {
				const testStage = new stage();
				let called = false;

				testStage.Ended(() => {
					called = true;
				});

				testStage.end();

				expect(called).toBe(true);
			});

			it("should call multiple callbacks", () => {
				const testStage = new stage();
				let count = 0;

				testStage.Ended(() => (count += 1));
				testStage.Ended(() => (count += 10));
				testStage.Ended(() => (count += 100));

				testStage.end();

				expect(count).toBe(111);
			});

			it("should call callbacks in order", () => {
				const testStage = new stage();
				const calls: number[] = [];

				testStage.Ended(() => calls.push(1));
				testStage.Ended(() => calls.push(2));
				testStage.Ended(() => calls.push(3));

				testStage.end();

				expect(calls).toEqual([1, 2, 3]);
			});

			it("should call callbacks before destroying instances", () => {
				const testStage = new stage();
				const part = new Instance("Part");
				let partExistsInCallback = false;

				part.Parent = Workspace;

				testStage.add(part);
				testStage.Ended(() => {
					partExistsInCallback = part.Parent !== undefined;
				});

				testStage.end();

				expect(partExistsInCallback).toBe(true);
			});
		});

		describe("end", () => {
			it("should destroy all tracked instances", () => {
				const testStage = new stage();
				const part1 = new Instance("Part");
				const part2 = new Instance("Part");

				testStage.add(part1);
				testStage.add(part2);

				testStage.end();

				expect(part1.Parent).toBeNil();
				expect(part2.Parent).toBeNil();
			});

			it("should deallocate the stage position", () => {
				const stage1 = new stage();
				const pos1 = stage1.worldPosition;

				stage1.end();

				const stage2 = new stage();
				expect(stage2.worldPosition).toEqual(pos1);
			});

			it("should set isActive to false", () => {
				const testStage = new stage();

				expect(testStage.isActive).toBe(true);
				testStage.end();
				expect(testStage.isActive).toBe(false);
			});

			it("should remove stage from getStages", () => {
				const testStage = new stage();

				expect(getStages()).toContain(testStage);

				testStage.end();

				expect(getStages()).never.toContain(testStage);
			});

			it("should call ended callbacks", () => {
				const testStage = new stage();
				let called = false;

				testStage.Ended(() => {
					called = true;
				});

				testStage.end();

				expect(called).toBe(true);
			});
		});

		describe("destroy", () => {
			it("should be an alias for end", () => {
				const testStage = new stage();
				const part = new Instance("Part");

				testStage.add(part);

				testStage.destroy();

				expect(part.Parent).toBeUndefined();
				expect(testStage.isActive).toBe(false);
			});
		});
	});

	describe("integration tests", () => {
		beforeEach(() => {
			initialize(new Vector3(0, 0, 1000), new Vector3(10000, 10000, 10000));
		});

		it("should handle complete stage lifecycle", () => {
			const testStage = new stage();
			const folder = new Instance("Folder");
			const part1 = new Instance("Part") as BasePart;
			const part2 = new Instance("Part") as BasePart;
			let endedCalled = false;

			testStage.add(part1, new Vector3(10, 0, 0));
			testStage.add(part2, new Vector3(-10, 0, 0));
			testStage.setParent(folder);
			testStage.Ended(() => {
				endedCalled = true;
			});

			expect(part1.Parent).toBe(folder);
			expect(part2.Parent).toBe(folder);
			expect(testStage.getObjects().size()).toBe(2);

			testStage.destroy();

			expect(endedCalled).toBe(true);
			expect(testStage.isActive).toBe(false);
			expect(folder.Parent).toBeUndefined();
		});

		it("should handle clear and reuse", () => {
			const testStage = new stage();
			const part1 = new Instance("Part");
			const part2 = new Instance("Part");

			testStage.add(part1);
			testStage.clear();

			expect(testStage.isActive).toBe(true);
			expect(part1.Parent).toBeUndefined();

			testStage.add(part2);
			expect(testStage.getObjects().size()).toBe(1);

			testStage.destroy();
		});

		it("should handle multiple stages with different configurations", () => {
			initialize(new Vector3(500, 0, 0), new Vector3(0, 0, 0));

			const stages = [new stage(), new stage(), new stage()];

			expect(stages[0].worldPosition).toEqual(new Vector3(0, 0, 0));
			expect(stages[1].worldPosition).toEqual(new Vector3(500, 0, 0));
			expect(stages[2].worldPosition).toEqual(new Vector3(1000, 0, 0));

			expect(getStages().size()).toBe(3);

			stages[1].destroy();
			expect(getStages().size()).toBe(2);

			const newStage = new stage();
			expect(newStage.worldPosition).toEqual(new Vector3(500, 0, 0));

			stages[0].destroy();
			stages[2].destroy();
			newStage.destroy();
		});

		it("should handle complex Model positioning", () => {
			const testStage = new stage();
			const model = new Instance("Model") as Model;
			const part = new Instance("Part") as BasePart;

			part.Parent = model;
			model.PrimaryPart = part;

			testStage.add(model, new Vector3(100, 50, 25));

			const expectedPos = testStage.worldPosition.add(new Vector3(100, 50, 25));
			expect(model.GetPivot().Position).toEqual(expectedPos);

			testStage.destroy();
		});

		it("should handle remove without affecting other instances", () => {
			const testStage = new stage();
			const parts = [new Instance("Part"), new Instance("Part"), new Instance("Part")];

			parts.forEach((p) => testStage.add(p));

			parts[1].Parent = Workspace;

			testStage.remove(parts[1]);

			testStage.destroy();

			expect(parts[0].Parent).toBeUndefined();
			expect(parts[1].Parent).toBeDefined();
			expect(parts[2].Parent).toBeUndefined();

			parts[1].Destroy();
		});

		it("should verify unique ids across multiple stages", () => {
			const stages = [new stage(), new stage(), new stage(), new stage()];
			const ids = stages.map((s) => s.id);

			const uniqueIds = new Set(ids);
			expect(uniqueIds.size()).toBe(stages.size());

			stages.forEach((s) => s.destroy());
		});

		it("should handle rapid stage creation and destruction", () => {
			const stages: stage[] = [];

			for (let i = 0; i < 10; i++) {
				stages.push(new stage());
			}

			expect(getStages().size()).toBe(10);

			for (const stage of stages) {
				const index = stages.indexOf(stage);
				expect(stage.worldPosition.Z).toEqual(10000 + index * 1000);
			}

			for (let i = 0; i < stages.size(); i += 2) {
				stages[i].destroy();
			}

			expect(getStages().size()).toBe(5);

			const newStages = [new stage(), new stage()];

			expect(newStages[0].worldPosition).toEqual(stages[0].worldPosition);
			expect(newStages[1].worldPosition).toEqual(stages[2].worldPosition);

			stages.forEach((s) => s.destroy());
			newStages.forEach((s) => s.destroy());
		});
	});
});
