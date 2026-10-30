<?php
// Import exported Koodipaja questions into a real Moodle with CodeRunner and grade them.
//
//   python3 scripts/export_coderunner.py -o koodipaja.xml --answers answers.json
//   php tools/moodle/coderunner-check.php --moodle=/path/to/moodle --xml=koodipaja.xml --answers=answers.json [--keep]
//
// For every imported question: the sample answer and every accepted/ solution must be
// graded fully right, and every wrong/ solution must not be. Uses CodeRunner's own grading
// (and therefore the Jobe server configured in Moodle). Creates a throwaway course, which
// --keep leaves in place for trying the questions in the browser.

define('CLI_SCRIPT', true);

$opts = getopt('', ['moodle:', 'xml:', 'answers:', 'keep']);
foreach (['moodle', 'xml', 'answers'] as $required) {
    if (empty($opts[$required])) {
        fwrite(STDERR, "usage: php coderunner-check.php --moodle=DIR --xml=FILE --answers=FILE\n");
        exit(2);
    }
}
$xmlfile = realpath($opts['xml']);
$answers = json_decode(file_get_contents($opts['answers']), true);

require($opts['moodle'] . '/config.php');
require_once($CFG->libdir . '/questionlib.php');
require_once($CFG->dirroot . '/course/lib.php');
require_once($CFG->dirroot . '/question/format/xml/format.php');

\core\session\manager::set_user(get_admin());

$course = create_course((object)[
    'fullname' => 'Koodipaja CodeRunner check',
    'shortname' => 'kpcr' . time(),
    'category' => 1,
]);
$context = context_course::instance($course->id);
$category = question_make_default_categories([$context]);

$format = new qformat_xml();
$format->setCategory($category);
$format->setContexts([$context]);
$format->setCourse($course);
$format->setFilename($xmlfile);
$format->setRealfilename(basename($xmlfile));
$format->setMatchgrades('error');
$format->setCatfromfile(true);
$format->setContextfromfile(true);
$format->setStoponerror(true);

ob_start();
$ok = $format->importpreprocess() && $format->importprocess() && $format->importpostprocess();
$importlog = ob_get_clean();
if (!$ok) {
    fwrite(STDERR, "import failed\n" . strip_tags($importlog) . "\n");
    exit(1);
}

$grade = function (qtype_coderunner_question $question, string $code): array {
    $question->start_attempt(null);
    try {
        [$fraction, $state, $data] = $question->grade_response(['answer' => $code], false, false);
        $detail = '';
        if ($state != question_state::$gradedright && !empty($data['_testoutcome'])) {
            $outcome = unserialize($data['_testoutcome']);
            $detail = $outcome->errormessage ?? '';
            foreach (($outcome->testresults ?? []) as $result) {
                if (!$result->iscorrect) {
                    $got = is_string($result->got ?? null) ? $result->got : json_encode($result->got ?? null);
                    $detail .= ' | first failing test got: ' . substr(trim($got), 0, 200);
                    break;
                }
            }
        }
        return [$state == question_state::$gradedright, $fraction, trim($detail)];
    } catch (Throwable $e) {
        return [false, 0, $e->getMessage()];
    }
};

$failures = 0;
$checked = 0;
foreach ($format->questionids as $id) {
    $question = question_bank::load_question($id);
    if (!$question instanceof qtype_coderunner_question) {
        continue;
    }
    $checked++;
    $name = $question->idnumber;
    [$right, $fraction, $error] = $grade($question, $question->answer);
    if (!$right) {
        $failures++;
        echo "FAIL  $name sample answer graded $fraction $error\n";
    } else {
        echo "ok    $name sample answer\n";
    }
    foreach (($answers[$name]['accepted'] ?? []) as $file => $code) {
        [$right, $fraction, $error] = $grade($question, $code);
        if (!$right) {
            $failures++;
            echo "FAIL  $name accepted/$file graded $fraction $error\n";
        }
    }
    foreach (($answers[$name]['known_differences'] ?? []) as $file) {
        echo "note  $name accepted/$file is not accepted by NearEqualityGrader (known difference)\n";
    }
    foreach (($answers[$name]['wrong'] ?? []) as $file => $code) {
        [$right] = $grade($question, $code);
        if ($right) {
            $failures++;
            echo "FAIL  $name wrong/$file was graded right\n";
        }
    }
}

if (isset($opts['keep'])) {
    echo "kept course id {$course->id} ({$course->shortname})\n";
} else {
    delete_course($course, false);
}
echo "\n$checked questions checked, " . ($failures ? "$failures failure(s)" : 'all passed') . "\n";
exit($failures ? 1 : 0);
