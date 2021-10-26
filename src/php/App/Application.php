<?php declare(strict_types=1);

namespace App;

use App\Kernel\PipeKernel;
use App\Pipe\{Pipe, PipeCollection};
use App\Task\{TaskCollection, LaunchGameTask};

final class Application
{
    public function run()
    {
        $kernel = new PipeKernel($this->getStartupPipeCollection());

        $kernel->processPipeline();
    }

    private function getStartupPipeCollection(): PipeCollection
    {
        $pipeCollection = new PipeCollection();
        $pipe = new Pipe(new TaskCollection());

        return $pipeCollection->add($pipe->addTask(new LaunchGameTask()));
    }
}
