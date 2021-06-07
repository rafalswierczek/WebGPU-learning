<?php declare(strict_types=1);

namespace App\WebGPUKernel;

interface PipeInterface
{
    public function processSequence(): bool;

    public function addTask(TaskInterface $task): self;
}