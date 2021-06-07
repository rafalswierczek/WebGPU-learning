<?php declare(strict_types=1);

namespace App\WebGPUKernel;

class TaskCollection implements \IteratorAggregate, \Countable, CollectionInterface
{
    /** @var TaskyInterface[] $taskList */
    private array $taskList = [];

    private TaskIterator $taskIterator;

    public function getIterator(): TaskIterator
    {
        if(!isset($this->taskIterator))
            $this->taskIterator = new TaskIterator($this);

        return $this->taskIterator;
    }

    public function getAll(): array
    {
        return $this->taskList;
    }

    public function add($task): self
    {
        $this->taskList[] = $task;
        return $this;
    }

    public function pop(bool $resetIndex = true)
    {
        unset($this->taskList[count($this->taskList) - 1]);

        if($resetIndex)
            $this->resetIndex();
    }

    public function remove(int $index, bool $resetIndex = true)
    {
        unset($this->taskList[$index]);

        if($resetIndex)
            $this->resetIndex();
    }

    public function count(): int
    {
        return count($this->taskList);
    }

    public function resetIndex()
    {
        $this->taskList = array_values($this->taskList);
    }

    public function isEmpty(): bool
    {
        return empty($this->taskList) ? true : false;
    }
}