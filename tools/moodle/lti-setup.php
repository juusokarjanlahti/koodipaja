<?php
// Set up a test Moodle for trying the Koodipaja LTI 1.3 launch end to end.
//
//   php tools/moodle/lti-setup.php --moodle=/path/to/moodle --app=http://localhost:3000
//
// Creates (or reuses) a site-level LTI 1.3 tool "Koodipaja" that opens in a new window and
// accepts grades, a course with one graded Koodipaja activity, and users kp-student /
// kp-teacher (password
// Koodipaja-1). Prints the client id and deployment id for `npm run lti:register`.
// For a test site only: it creates users with a known password.

define('CLI_SCRIPT', true);

$opts = getopt('', ['moodle:', 'app:']);
if (empty($opts['moodle']) || empty($opts['app'])) {
    fwrite(STDERR, "usage: php lti-setup.php --moodle=DIR --app=URL\n");
    exit(2);
}
$app = rtrim($opts['app'], '/');

require($opts['moodle'] . '/config.php');
require_once($CFG->dirroot . '/mod/lti/locallib.php');
require_once($CFG->dirroot . '/mod/lti/lib.php');
require_once($CFG->dirroot . '/course/lib.php');
require_once($CFG->dirroot . '/user/lib.php');
require_once($CFG->libdir . '/enrollib.php');

\core\session\manager::set_user(get_admin());

$type = $DB->get_record('lti_types', ['name' => 'Koodipaja', 'ltiversion' => LTI_VERSION_1P3]);
if (!$type) {
    $type = (object)[
        'state' => LTI_TOOL_STATE_CONFIGURED,
        'course' => SITEID,
        'coursevisible' => LTI_COURSEVISIBLE_ACTIVITYCHOOSER,
    ];
    $config = (object)[
        'lti_typename' => 'Koodipaja',
        'lti_toolurl' => "$app/api/lti/launch",
        'lti_description' => 'Ohjelmointitehtävät',
        'lti_ltiversion' => LTI_VERSION_1P3,
        'lti_keytype' => LTI_JWK_KEYSET,
        'lti_publickeyset' => "$app/api/lti/jwks",
        'lti_initiatelogin' => "$app/api/lti/login",
        'lti_redirectionuris' => "$app/api/lti/launch",
        'lti_coursevisible' => LTI_COURSEVISIBLE_ACTIVITYCHOOSER,
        'lti_launchcontainer' => LTI_LAUNCH_CONTAINER_WINDOW,
        'lti_sendname' => LTI_SETTING_ALWAYS,
        'lti_sendemailaddr' => LTI_SETTING_NEVER,
        'lti_acceptgrades' => LTI_SETTING_ALWAYS,
        // Assignment and Grade Services: grade sync and column management.
        'ltiservice_gradesynchronization' => 2,
        'lti_forcessl' => 0,
    ];
    $typeid = lti_add_type($type, $config);
    $type = $DB->get_record('lti_types', ['id' => $typeid]);
}
// Older runs of this script created the tool without grades; make sure they are on.
foreach (['acceptgrades' => LTI_SETTING_ALWAYS, 'ltiservice_gradesynchronization' => 2] as $name => $value) {
    $existing = $DB->get_record('lti_types_config', ['typeid' => $type->id, 'name' => $name]);
    if ($existing) {
        $DB->set_field('lti_types_config', 'value', $value, ['id' => $existing->id]);
    } else {
        $DB->insert_record('lti_types_config', (object)['typeid' => $type->id, 'name' => $name, 'value' => $value]);
    }
}

$course = $DB->get_record('course', ['shortname' => 'KP-LTI']);
if (!$course) {
    $course = create_course((object)[
        'fullname' => 'Ohjelmoinnin perusteet (LTI-testi)',
        'shortname' => 'KP-LTI',
        'category' => 1,
    ]);
}

$users = [];
foreach (['student' => 'Aino Opiskelija', 'editingteacher' => 'Olli Opettaja'] as $role => $name) {
    $username = $role === 'student' ? 'kp-student' : 'kp-teacher';
    $user = $DB->get_record('user', ['username' => $username]);
    if (!$user) {
        [$first, $last] = explode(' ', $name);
        $id = user_create_user((object)[
            'username' => $username,
            'password' => 'Koodipaja-1',
            'firstname' => $first,
            'lastname' => $last,
            'email' => "$username@example.test",
            'auth' => 'manual',
            'confirmed' => 1,
            'mnethostid' => $CFG->mnet_localhost_id,
        ]);
        $user = $DB->get_record('user', ['id' => $id]);
    }
    $roleid = $DB->get_field('role', 'id', ['shortname' => $role]);
    enrol_try_internal_enrol($course->id, $user->id, $roleid);
    $users[$role] = $user;
}

$cm = $DB->get_record_sql(
    "SELECT cm.id FROM {course_modules} cm JOIN {modules} m ON m.id = cm.module AND m.name = 'lti'
       JOIN {lti} l ON l.id = cm.instance WHERE cm.course = ? AND l.typeid = ?",
    [$course->id, $type->id],
    IGNORE_MULTIPLE
);
if (!$cm) {
    $moduleinfo = create_module((object)[
        'modulename' => 'lti',
        'course' => $course->id,
        'section' => 0,
        'visible' => 1,
        'name' => 'Tervehdys (Koodipaja)',
        'introeditor' => ['text' => '', 'format' => FORMAT_HTML, 'itemid' => 0],
        'typeid' => $type->id,
        'toolurl' => "$app/exercises/01-tervehdys",
        'launchcontainer' => LTI_LAUNCH_CONTAINER_DEFAULT,
        'instructorchoicesendname' => 1,
        'instructorchoicesendemailaddr' => 0,
        'instructorchoiceacceptgrades' => 1,
        'grade' => 100,
    ]);
    $cmid = $moduleinfo->coursemodule;
} else {
    $cmid = $cm->id;
    $instance = $DB->get_record('lti', ['id' => $DB->get_field('course_modules', 'instance', ['id' => $cmid])]);
    $hasgradeitem = $DB->record_exists('grade_items', ['itemmodule' => 'lti', 'iteminstance' => $instance->id]);
    if (!$instance->instructorchoiceacceptgrades || (int)$instance->grade !== 100 || !$hasgradeitem) {
        $instance->instructorchoiceacceptgrades = 1;
        $instance->grade = 100;
        $DB->update_record('lti', $instance);
        lti_grade_item_update($instance);
    }
}

echo json_encode([
    'issuer' => $CFG->wwwroot,
    'client_id' => $type->clientid,
    'deployment_id' => (string)$type->id,
    'activity_url' => "$CFG->wwwroot/mod/lti/view.php?id=$cmid",
    'launch_url' => "$CFG->wwwroot/mod/lti/launch.php?id=$cmid",
    'register' => "npm run lti:register -- --moodle $CFG->wwwroot --client-id $type->clientid --deployment $type->id",
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
