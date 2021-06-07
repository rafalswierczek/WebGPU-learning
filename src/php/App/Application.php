<?php declare(strict_types=1);

namespace App;

use App\WebGPUKernel\Kernel;
use App\WebGPUKernel\PipeCollection;

final class Application
{
    public function run()
    {
        $pipeCollection = new PipeCollection();

        $kernel = new Kernel($pipeCollection);

        $kernel->processPipeline();
    }
}