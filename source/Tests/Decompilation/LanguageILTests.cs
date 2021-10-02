using System.Threading.Tasks;
using Xunit;
using Xunit.Abstractions;
using SharpLab.Tests.Internal;
using SharpLab.Server.Common;
using System.Linq;

namespace SharpLab.Tests.Decompilation {
    public class LanguageILTests {
        private readonly ITestOutputHelper _output;

        public LanguageILTests(ITestOutputHelper output) {
            _output = output;
            // TestAssemblyLog.Enable(output);
        }

        [Theory]
        [InlineData("IL/EmptyMethod.il")]
        public async Task SlowUpdate_ReturnsExpectedDecompiledCode(string codeFilePath) {
            var code = await TestCode.FromFileAsync(codeFilePath);
            var driver = await TestDriverFactory.FromCodeAsync(code);

            var result = await driver.SendSlowUpdateAsync<string>();
            var errors = result.JoinErrors();

            var decompiledText = result.ExtensionResult?.Trim();
            Assert.True(string.IsNullOrEmpty(errors), errors);
            code.AssertIsExpected(decompiledText, _output);
        }

        [Theory]
        [InlineData("BaseM")]
        [InlineData("Base::M")]
        public async Task SlowUpdate_ReturnsErrorDiagnostic_ForMethodOverrideOutsideOfType(string baseMethod) {
            // Arrange
            var code = @"
                .assembly _ {
                }

                .method hidebysig newslot virtual 
	                instance void M() cil managed 
                {
	                .override method instance void " + baseMethod + @"()
                    ret
                }
            ";
            var driver = await TestDriverFactory.FromCode(code, LanguageNames.IL, LanguageNames.IL);

            // Act
            var result = await driver.SendSlowUpdateAsync<string>();

            // Assert
            Assert.Equal(
                new[] { ("error", "IL", "Method 'M' is outside class scope and cannot be an override.") },
                result.Diagnostics.Select(d => (d.Severity, d.Id, d.Message)).ToArray()
            );
        }
    }
}
