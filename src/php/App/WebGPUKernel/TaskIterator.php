<?php declare(strict_types=1);

namespace App\WebGPUKernel;

class TaskIterator implements \Iterator
{
    /** @var TaskInterface[] $taskList */
    private array $taskList = [];
    private TaskCollection $taskCollection;

    public function __construct(TaskCollection $taskCollection)
    {
        $this->taskCollection = $taskCollection;
    }

    public function rewind() 
    {
        $this->taskList = $this->taskCollection->getAll();
        reset($this->taskList);
    }

    public function current(): TaskInterface
    {
        return current($this->taskList);
    }

    public function key()
    {
        return key($this->taskList);
    }

    public function next()
    {
        next($this->taskList);
    }

    public function valid(): bool
    {
        $task = current($this->taskList);

        return !empty($task) && $task instanceof TaskInterface;
    }
}