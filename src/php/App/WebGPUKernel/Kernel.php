<?php declare(strict_types=1);

namespace App\WebGPUKernel;

use App\Task\GameTask;

class Kernel
{
    protected CollectionInterface $pipeCollection;

    public function __construct(CollectionInterface $pipeCollection)
    {
        $this->pipeCollection = $pipeCollection;
    }

    public function processPipeline()
    {
        $this->setGamePipe();
        
        foreach($this->pipeCollection as $pipe)
        {
            $pipe->processSequence();
        }
    }

    private function setGamePipe(): void
    {
        $this->pipeCollection->add(
            (new Pipe(new TaskCollection))
                ->addTask(new GameTask())
        );
    }
}