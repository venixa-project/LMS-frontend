const fs = require('fs');
const path = require('path');

const coursesPagePath = path.resolve(__dirname, '../src/pages/Courses/CoursesPage.tsx');
let code = fs.readFileSync(coursesPagePath, 'utf-8');

const regex = /<div className="modal-body" style=\{\{ display: 'flex', flexDirection: 'column', gap: '14px' \}\}>[\s\S]*?<\/tbody>\s*<\/table>\s*<\/div>\s*<\/div>/;

const replacementModalBody = `<div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {dynamicRoster.length > 0 && (
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search enrolled students by name, email, or cohort..."
                    value={rosterSearchTerm}
                    onChange={(e) => setRosterSearchTerm(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '32px', fontSize: '0.82rem', padding: '6px 32px' }}
                  />
                  {rosterSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setRosterSearchTerm('')}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              )}

              {dynamicRoster.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 16px' }}>
                  <Users size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 10px', opacity: 0.7 }} />
                  <h4 style={{ fontSize: '1rem', margin: '0 0 6px', fontWeight: 700 }}>No Enrolled Students Yet</h4>
                  <p className="text-secondary text-xs" style={{ maxWidth: '380px', margin: '0 auto 16px', lineHeight: 1.5 }}>
                    This course currently has no active student enrollments. Use the student assignment tool to assign learners from your authorized cohorts.
                  </p>
                  <Link
                    to={\`/courses/\${rosterCourse.id}/assign-students\`}
                    className="btn btn-primary btn-sm"
                    onClick={() => setRosterCourse(null)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <UserPlus size={14} /> Assign Students to Course
                  </Link>
                </div>
              ) : filteredCourseRoster.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                  <p className="text-secondary text-sm" style={{ margin: 0 }}>
                    No enrolled students matched "{rosterSearchTerm}".
                  </p>
                </div>
              ) : (
                <div className="table-container" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Class / Cohort</th>
                        <th>Progress</th>
                        <th>Attendance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCourseRoster.map((st) => (
                        <tr key={st.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{st.name}</div>
                            <div className="text-muted text-xs">{st.email}</div>
                          </td>
                          <td>
                            <span className="badge badge-secondary">{st.cohort}</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '2px' }}>
                              <span>{st.progress}%</span>
                            </div>
                            <div className="progress-bar-bg" style={{ height: '5px' }}>
                              <div className="progress-bar-fill" style={{ width: \`\${st.progress}%\` }} />
                            </div>
                          </td>
                          <td>
                            <span style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.8rem' }}>{st.attendance}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>`;

if (regex.test(code)) {
  code = code.replace(regex, replacementModalBody);
  fs.writeFileSync(coursesPagePath, code, 'utf-8');
  console.log('Successfully enhanced modal body with regex!');
} else {
  console.error('Regex did not match!');
}
