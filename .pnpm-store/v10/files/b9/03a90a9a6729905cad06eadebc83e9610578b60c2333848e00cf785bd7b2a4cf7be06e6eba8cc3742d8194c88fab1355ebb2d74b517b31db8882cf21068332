{
  'target_defaults': {
    'dependencies': [
      "<!(node -p \"require('node-addon-api').targets\"):node_addon_api_except",
    ],
    'conditions': [
      ['OS=="win"', {
        'msvs_configuration_attributes': {
          'SpectreMitigation': 'Spectre'
        },
        'msvs_settings': {
          'VCCLCompilerTool': {
            'AdditionalOptions': [
              '/guard:cf',
              '/sdl',
              '/W3',
              '/we4146',
              '/we4244',
              '/we4267',
              '/ZH:SHA_256'
            ]
          },
          'VCLinkerTool': {
            'AdditionalOptions': [
              '/DYNAMICBASE',
              '/guard:cf'
            ]
          }
        },
      }, {
        'cflags': ['-O2', '-fstack-protector-strong'],
      }],
    ],
  },
  'conditions': [
    ['OS=="win"', {
      'targets': [
        {
          'target_name': 'conpty',
          'sources' : [
            'src/win/conpty.cc',
            'src/win/path_util.cc'
          ],
          'libraries': [
            '-lshlwapi'
          ],
        },
        {
          'target_name': 'conpty_console_list',
          'sources' : [
            'src/win/conpty_console_list.cc'
          ],
        }
      ]
    }, { # OS!="win"
      'targets': [
        {
          'target_name': 'pty',
          'sources': [
            'src/unix/pty.cc',
          ],
          'libraries': [
            '-lutil'
          ],
          'cflags': ['-Wall'],
          'ldflags': [],
          'conditions': [
            # http://www.gnu.org/software/gnulib/manual/html_node/forkpty.html
            #   One some systems (at least including Cygwin, Interix,
            #   OSF/1 4 and 5, and Mac OS X) linking with -lutil is not required.
            ['OS=="mac" or OS=="solaris"', {
              'libraries!': [
                '-lutil'
              ]
            }],
            ['OS=="linux"', {
              'variables': {
                'sysroot%': '<!(node -p "process.env.SYSROOT_PATH || \'\'")',
                'target_arch%': '<!(node -p "process.env.npm_config_arch || process.arch")',
              },
              'conditions': [
                ['sysroot!=""', {
                  'variables': {
                    'gcc_include%': '<!(${CXX:-g++} -print-file-name=include)',
                  },
                  'conditions': [
                    ['target_arch=="x64"', {
                      'cflags': [
                        '--sysroot=<(sysroot)',
                        '-nostdinc',
                        '-isystem<(gcc_include)',
                        '-isystem<(sysroot)/usr/include',
                        '-isystem<(sysroot)/usr/include/x86_64-linux-gnu'
                      ],
                      'cflags_cc': [
                        '-nostdinc++',
                        '-isystem<(sysroot)/../include/c++/10.5.0',
                        '-isystem<(sysroot)/../include/c++/10.5.0/x86_64-linux-gnu',
                        '-isystem<(sysroot)/../include/c++/10.5.0/backward'
                      ],
                      'ldflags': [
                        '--sysroot=<(sysroot)',
                        '-L<(sysroot)/lib',
                        '-L<(sysroot)/usr/lib'
                      ],
                    }],
                    ['target_arch=="arm64"', {
                      'cflags': [
                        '--sysroot=<(sysroot)',
                        '-nostdinc',
                        '-isystem<(gcc_include)',
                        '-isystem<(sysroot)/usr/include',
                        '-isystem<(sysroot)/usr/include/aarch64-linux-gnu'
                      ],
                      'cflags_cc': [
                        '-nostdinc++',
                        '-isystem<(sysroot)/../include/c++/10.5.0',
                        '-isystem<(sysroot)/../include/c++/10.5.0/aarch64-linux-gnu',
                        '-isystem<(sysroot)/../include/c++/10.5.0/backward'
                      ],
                      'ldflags': [
                        '--sysroot=<(sysroot)',
                        '-L<(sysroot)/lib',
                        '-L<(sysroot)/usr/lib'
                      ],
                    }]
                  ]
                }]
              ]
            }]
          ]
        }
      ]
    }],
    ['OS=="mac"', {
      'targets': [
        {
          'target_name': 'spawn-helper',
          'type': 'executable',
          'sources': [
            'src/unix/spawn-helper.cc',
          ],
          "xcode_settings": {
            "MACOSX_DEPLOYMENT_TARGET":"10.7"
          }
        },
      ]
    }]
  ]
}
