<?php declare(strict_types=1);

namespace App\Task;

class TaskCollection implements \IteratorAggregate, \Countable
{
    private array $taskList = [];
    private TaskIterator $taskIterator;

    public function getIterator(): TaskIterator
    {
        // allow to get manually the same iterator and handle it:
        if (!isset($this->taskIterator)) {
            $this->taskIterator = new TaskIterator($this);
        }

        return $this->taskIterator;
    }

    public function getAll(): array
    {
        return $this->taskList;
    }

    public function add(TaskInterface $task): self
    {
        $this->taskList[] = $task;

        return $this;
    }

    public function pop(bool $resetIndex = true): self
    {
        unset($this->taskList[count($this->taskList) - 1]);

        if ($resetIndex) {
            $this->resetIndex();
        }

        return $this;
    }

    public function remove(int $index, bool $resetIndex = true): self
    {
        unset($this->taskList[$index]);

        if ($resetIndex) {
            $this->resetIndex();
        }

        return $this;
    }

    public function count(): int
    {
        return count($this->taskList);
    }

    public function resetIndex(): self
    {
        $this->taskList = array_values($this->taskList);

        return $this;
    }

    public function isEmpty(): bool
    {
        return empty($this->taskList);
    }
}
