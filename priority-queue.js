/**
 * Custom Min-Heap Priority Queue
 * Implements a binary min-heap with an auxiliary Index Map to allow
 * decrease-key (decreasePriority) operations in O(log N) time.
 */
class MinPriorityQueue {
    constructor() {
        this.heap = [];
        // Map to store the index of each element in the heap array for O(1) lookups
        this.indexMap = new Map();
    }

    getParentIndex(index) {
        return Math.floor((index - 1) / 2);
    }

    getLeftChildIndex(index) {
        return 2 * index + 1;
    }

    getRightChildIndex(index) {
        return 2 * index + 2;
    }

    swap(i, j) {
        const temp = this.heap[i];
        this.heap[i] = this.heap[j];
        this.heap[j] = temp;

        this.indexMap.set(this.heap[i].element, i);
        this.indexMap.set(this.heap[j].element, j);
    }

    isEmpty() {
        return this.heap.length === 0;
    }

    size() {
        return this.heap.length;
    }

    contains(element) {
        return this.indexMap.has(element);
    }

    insert(element, priority) {
        if (this.indexMap.has(element)) {
            this.decreasePriority(element, priority);
            return;
        }

        const node = { element, priority };
        this.heap.push(node);
        const index = this.heap.length - 1;
        this.indexMap.set(element, index);
        this.heapifyUp(index);
    }

    extractMin() {
        if (this.isEmpty()) return null;

        const min = this.heap[0];
        const last = this.heap.pop();
        this.indexMap.delete(min.element);

        if (this.heap.length > 0) {
            this.heap[0] = last;
            this.indexMap.set(last.element, 0);
            this.heapifyDown(0);
        }

        return min;
    }

    decreasePriority(element, newPriority) {
        const index = this.indexMap.get(element);
        if (index === undefined) return;

        // Only update if the new priority is indeed lower
        if (newPriority < this.heap[index].priority) {
            this.heap[index].priority = newPriority;
            this.heapifyUp(index);
        }
    }

    heapifyUp(index) {
        let currentIndex = index;
        while (currentIndex > 0) {
            const parentIndex = this.getParentIndex(currentIndex);
            if (this.heap[currentIndex].priority < this.heap[parentIndex].priority) {
                this.swap(currentIndex, parentIndex);
                currentIndex = parentIndex;
            } else {
                break;
            }
        }
    }

    heapifyDown(index) {
        let currentIndex = index;
        const length = this.heap.length;

        while (true) {
            const leftChildIndex = this.getLeftChildIndex(currentIndex);
            const rightChildIndex = this.getRightChildIndex(currentIndex);
            let smallestIndex = currentIndex;

            if (leftChildIndex < length && this.heap[leftChildIndex].priority < this.heap[smallestIndex].priority) {
                smallestIndex = leftChildIndex;
            }

            if (rightChildIndex < length && this.heap[rightChildIndex].priority < this.heap[smallestIndex].priority) {
                smallestIndex = rightChildIndex;
            }

            if (smallestIndex !== currentIndex) {
                this.swap(currentIndex, smallestIndex);
                currentIndex = smallestIndex;
            } else {
                break;
            }
        }
    }
}

module.exports = MinPriorityQueue;
