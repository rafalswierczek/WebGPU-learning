<?php declare(strict_types=1);

namespace App\Kernel;

use App\Pipe\PipeCollection;

final class PipeKernel
{
    public function __construct(
        protected PipeCollection $pipeCollection = new PipeCollection()
    ) {}

    public function processPipeline()
    {   
        foreach($this->pipeCollection as $pipe)
        {
            $pipe->processSequence();
        }
    }
}
