import { HttpService } from "@rbxts/services";

const stageAllocator = new Map<Vector3, stage>();

let stageGap = new Vector3(0, 0, 1000);
let stageOrigin = new Vector3(10000, 10000, 10000);

/**
 * Gives you currently active stages
 *
 * @returns A array of existing stages
 */
export function getStages(): Array<stage> {
	const newTable = new Array<stage>();

	stageAllocator.forEach((stage) => {
		newTable.push(stage);
	});

	return newTable;
}

/**
 * Ends all stages and removes them from the allocator
 */
export function endStages() {
	stageAllocator.forEach((stage, key) => {
		stage.end();
		stageAllocator.delete(key);
	});
}

/**
 * Set `gap` and `origin` for stage allocation
 *
 * @param gap Gap between each stage
 * @param origin Starting position for stage placement
 */
export function initialize(gap?: Vector3, origin?: Vector3) {
	if (gap) stageGap = gap;
	if (origin) stageOrigin = origin;
}

/**
 * Automatically allocates position to avoid interference with other stages.
 * Provides functions to mount `Instance` and cleanup when done.
 */
export class stage {
	/**
	 * Creates and allocates a new stage
	 */
	constructor() {
		this.allocateStage(stageOrigin);
		this.isActive = true;
	}

	/**
	 * Stage's center in world space
	 */
	public worldPosition = Vector3.zero;

	/**
	 * Unique identifier generated with `HttpService.GenerateGUID()`
	 */
	public readonly id = HttpService.GenerateGUID();

	/**
	 * A readonly timestamp when the stage was constructed using `os.clock()`
	 */
	public readonly createdAt = os.clock();

	/**
	 * Whether the stage is still active or not
	 */
	public isActive: boolean = true;

	/**
	 * Instances tracked for cleanup
	 */
	private cleanup = new Array<Instance>();

	/**
	 * Callbacks to fire when stage ends
	 */
	private endedCallbacks = new Array<() => void>();

	/**
	 * Allocates stage position and registers in allocator
	 *
	 * @param origin Starting position, recursively increments by `stageGap` until empty slot found
	 */
	private allocateStage(origin: Vector3) {
		if (stageAllocator.get(origin) === undefined) {
			// This means that position is empty

			this.worldPosition = origin;

			stageAllocator.set(origin, this);
		} else {
			this.allocateStage(origin.add(stageGap));
		}
	}

	/**
	 * Adds an object to the stage for automatic cleanup
	 *
	 * @param object `Instance` to add
	 * @param relativePosition Position relative to stage center (only applies to `BasePart` and `Model`)
	 */
	public add(object: Instance, relativePosition?: Vector3) {
		this.cleanup.push(object);

		if (!relativePosition) return;

		if (object.IsA("BasePart")) object.Position = this.worldPosition.add(relativePosition);
		else if (object.IsA("Model")) object.PivotTo(new CFrame(this.worldPosition.add(relativePosition)));
	}

	/**
	 * Removes an object from the stage from the cleanup
	 *
	 * @param object `Instance` to remove
	 */
	public remove(object: Instance) {
		const find = this.cleanup.findIndex((V) => V === object);

		if (find !== -1) this.cleanup.remove(find);
	}

	/**
	 * Parents all tracked `Instance`s
	 *
	 * @param parent The parent all tracked `Instance` will be parented to
	 */
	setParent(parent: Instance) {
		for (const obj of this.cleanup) {
			obj.Parent = parent;
		}
	}

	/**
	 * Cleans up all tracked `Instance` that is tracked to the stage
	 */
	public clear() {
		for (const obj of this.cleanup) {
			const index = this.cleanup.indexOf(obj);
			this.cleanup.remove(index);
			obj.Destroy();
		}
	}

	/**
	 * @returns Array of tracked `Instances`
	 */
	public getObjects(): Array<Instance> {
		return this.cleanup;
	}

	/**
	 * Register a callback to run when stage ends
	 *
	 * @param callback Function to call on stage end
	 */
	public Ended(callback: () => void) {
		this.endedCallbacks.push(callback);
	}

	/**
	 * Destroys all tracked objects and deallocates the stage
	 */
	public end() {
		for (const callback of this.endedCallbacks) {
			callback();
		}

		for (const obj of this.cleanup) {
			const index = this.cleanup.indexOf(obj);
			this.cleanup.remove(index);
			obj.Destroy();
		}

		stageAllocator.delete(this.worldPosition);

		this.isActive = false;
	}

	/**
	 * Alias for `end()`
	 */
	public destroy() {
		this.end();
	}
}
