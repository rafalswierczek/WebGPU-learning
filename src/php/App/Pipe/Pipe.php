<?php declare(strict_types=1);

namespace App\Pipe;

use App\Task\{TaskCollection, TaskInterface};

class Pipe implements PipeInterface
{
    private TaskCollection $taskCollection;

    public function __construct(TaskCollection $taskCollection)
    {
        $this->taskCollection = $taskCollection;
    }
    
    public function processSequence(): self
    {
        foreach ($this->taskCollection as $task) {
            $task->execute();
        }

        return $this;
    }

    public function addTask(TaskInterface $task): self
    {
        $this->taskCollection->add($task);

        return $this;
    }
}
