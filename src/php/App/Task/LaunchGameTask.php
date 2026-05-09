<?php declare(strict_types=1);

namespace App\Task;

use App\Component\Response;

class LaunchGameTask extends Task
{
    public function execute(): void
    {
        // todo: add application path
        $body = file_get_contents(__DIR__.'/../index.html');

        (new Response($body))->show();
    }

    public function __invoke()
    {
        $this->execute();
    }
}
