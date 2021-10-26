<?php declare(strict_types=1);

namespace App\Pipe;

use App\Task\TaskInterface;

interface PipeInterface
{
    public function processSequence(): self;

    public function addTask(TaskInterface $task): self;
}
