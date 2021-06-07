<?php declare(strict_types=1);

namespace App\WebGPUKernel;

class Pipe implements PipeInterface
{
    private TaskCollection $taskCollection;

    public function __construct(TaskCollection $taskCollection)
    {
        $this->taskCollection = $taskCollection;
    }
    
    public function processSequence(): bool
    {
        foreach($this->taskCollection as $task)
        {
            $task->execute();
        }

        return true;
    }

    public function addTask(TaskInterface $task): self
    {
        $this->taskCollection->add($task);
        return $this;
    }
}