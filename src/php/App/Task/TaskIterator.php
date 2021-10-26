<?php declare(strict_types=1);

namespace App\Task;

class TaskIterator implements \Iterator
{
    private array $taskList = [];
    private TaskCollection $taskCollection;

    public function __construct(TaskCollection $taskCollection)
    {
        $this->taskCollection = $taskCollection;
    }

    public function rewind(): void
    {
        $this->taskList = $this->taskCollection->getAll();
        reset($this->taskList);
    }

    public function current(): TaskInterface
    {
        return current($this->taskList);
    }

    public function key(): mixed
    {
        return key($this->taskList);
    }

    public function next(): void
    {
        next($this->taskList);
    }

    public function valid(): bool
    {
        $task = current($this->taskList);

        return !empty($task) && $task instanceof TaskInterface;
    }
}
