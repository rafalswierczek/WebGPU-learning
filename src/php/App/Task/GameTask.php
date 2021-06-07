<?php declare(strict_types=1);

namespace App\Task;

use App\Component\Response;

class GameTask extends Task
{
    public function execute(): bool
    {
        // todo: add application path
        $body = file_get_contents(__DIR__.'/../index.html');

        (new Response($body))->show();

        return false;
    }

    public function __invoke()
    {
        $this->execute();
    }
}